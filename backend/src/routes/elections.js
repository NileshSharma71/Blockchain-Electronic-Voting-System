const express = require('express');
const Election = require('../models/Election');
const Ballot = require('../models/Ballot');
const { authMiddleware, adminOnly, verifiedOnly } = require('../middleware/auth');
const { sha256 } = require('../utils/hash');
const { broadcastNewElection, broadcastElectionResult } = require('../services/socketService');
const { tallyElection } = require('../services/tallyService');

const router = express.Router();

// Helper to safely parse and validate page numbers
function getPageAndSkip(pageStr, limit = 20) {
  let page = parseInt(pageStr) || 1;
  page = Math.max(1, Math.min(page, 1000));
  const skip = (page - 1) * limit;
  return { page, skip };
}

// POST /api/elections — create a new election (admin only)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { title, description, candidates, startTime, endTime } = req.body;

    if (!title || typeof title !== 'string' || title.length < 5 || title.length > 200) {
      return res.status(400).json({ error: 'Title must be 5-200 characters' });
    }
    if (description && (typeof description !== 'string' || description.length > 2000)) {
      return res.status(400).json({ error: 'Description must be under 2000 characters' });
    }
    if (!candidates || !Array.isArray(candidates) || candidates.length < 2) {
      return res.status(400).json({ error: 'At least 2 candidates are required' });
    }
    if (candidates.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 candidates allowed' });
    }
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime are required' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    if (end <= start) {
      return res.status(400).json({ error: 'endTime must be after startTime' });
    }

    const contentRaw = `${title}${description || ''}${JSON.stringify(candidates)}`;
    const contentHash = sha256(contentRaw);

    const existing = await Election.findOne({ contentHash });
    if (existing) return res.status(409).json({ error: 'Duplicate election already exists' });

    const now = new Date();
    let status = 'upcoming';
    if (now >= start && now <= end) status = 'active';
    if (now > end) status = 'completed';

    const election = new Election({
      title,
      description: description || '',
      candidates: candidates.map(c => ({
        name: c.name,
        description: c.description || '',
        party: c.party || '',
      })),
      createdBy: req.user.userId,
      startTime: start,
      endTime: end,
      contentHash,
      status,
    });
    await election.save();

    broadcastNewElection(election);

    res.status(201).json(election);
  } catch (e) {
    console.error('Election create error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/elections — list elections (paginated, with filters)
router.get('/', async (req, res) => {
  try {
    const { page, skip } = getPageAndSkip(req.query.page, 20);
    const limit = 20;
    const query = {};

    if (req.query.status) query.status = req.query.status;
    if (req.query.q) query.title = { $regex: req.query.q, $options: 'i' };

    const total = await Election.countDocuments(query);
    const elections = await Election.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'username');

    // Attach live vote counts
    const electionsWithCounts = await Promise.all(
      elections.map(async (election) => {
        const voteCount = await Ballot.countDocuments({ electionId: election._id });
        const plain = election.toObject();
        return { ...plain, totalVotes: voteCount };
      })
    );

    res.json({ elections: electionsWithCounts, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    console.error('Election list error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/elections/:id — single election with vote counts per candidate
router.get('/:id', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id).populate('createdBy', 'username');
    if (!election) return res.status(404).json({ error: 'Election not found' });

    // Count votes per candidate
    const ballots = await Ballot.find({ electionId: election._id });
    const voteCounts = {};
    for (const candidate of election.candidates) {
      voteCounts[candidate._id.toString()] = 0;
    }
    for (const ballot of ballots) {
      const key = ballot.candidateId.toString();
      if (voteCounts[key] !== undefined) voteCounts[key] += 1;
    }

    const plain = election.toObject();
    res.json({ ...plain, totalVotes: ballots.length, voteCounts });
  } catch (e) {
    console.error('Election detail error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/elections/leaderboard/voters — top voters (for dashboard)
router.get('/leaderboard/voters', async (req, res) => {
  try {
    const aggregation = await Ballot.aggregate([
      { $group: { _id: '$voterId', totalVotes: { $sum: 1 } } },
      { $sort: { totalVotes: -1 } },
      { $limit: 50 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { username: '$user.username', totalVotes: 1 } },
    ]);
    res.json({ voters: aggregation });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/elections/:id/close — admin force-end an active election
router.patch('/:id/close', authMiddleware, adminOnly, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ error: 'Election not found' });
    if (election.status === 'completed') {
      return res.status(400).json({ error: 'Election is already completed' });
    }
    if (election.status === 'upcoming') {
      return res.status(400).json({ error: 'Cannot close an election that has not started yet' });
    }

    // Set end time to now and mark completed
    election.endTime = new Date();
    election.status = 'completed';
    await election.save();

    // Tally and log result on-chain
    const result = await tallyElection(election._id);
    broadcastElectionResult(election._id, result);

    res.json({ message: 'Election closed and tallied successfully', election, result });
  } catch (e) {
    console.error('Election close error:', e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

// PATCH /api/elections/:id/start — admin force-start an upcoming election early
router.patch('/:id/start', authMiddleware, adminOnly, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ error: 'Election not found' });
    if (election.status === 'active') {
      return res.status(400).json({ error: 'Election is already active' });
    }
    if (election.status === 'completed') {
      return res.status(400).json({ error: 'Election is already completed' });
    }

    // Move startTime to now, activate
    election.startTime = new Date();
    election.status = 'active';
    await election.save();

    res.json({ message: 'Election started successfully', election });
  } catch (e) {
    console.error('Election start error:', e);
    res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

module.exports = router;
