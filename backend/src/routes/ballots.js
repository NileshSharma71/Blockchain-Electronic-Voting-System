const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Ballot = require('../models/Ballot');
const Election = require('../models/Election');
const User = require('../models/User');
const { authMiddleware, verifiedOnly } = require('../middleware/auth');
const { ballotLimiter } = require('../middleware/rateLimit');
const { broadcastBallotUpdate } = require('../services/socketService');
const blockchainService = require('../services/blockchainService');
const { sha256, hexToBytes32 } = require('../utils/hash');

const router = express.Router();

// POST /api/ballots — cast a ballot (verified voters only)
router.post('/', authMiddleware, verifiedOnly, ballotLimiter, async (req, res) => {
  try {
    const { electionId, candidateId } = req.body;

    if (!electionId) return res.status(400).json({ error: 'electionId is required' });
    if (!candidateId) return res.status(400).json({ error: 'candidateId is required' });

    // Find the election
    const election = await Election.findById(electionId);
    if (!election) return res.status(404).json({ error: 'Election not found' });

    // Check election is active
    const now = new Date();
    if (now < election.startTime) {
      return res.status(400).json({ error: 'Voting has not started yet' });
    }
    if (now > election.endTime) {
      return res.status(400).json({ error: 'Voting period has ended' });
    }
    if (election.status === 'completed') {
      return res.status(400).json({ error: 'This election has been finalized' });
    }

    // Validate candidate exists in this election
    const validCandidate = election.candidates.find(c => c._id.toString() === candidateId);
    if (!validCandidate) {
      return res.status(400).json({ error: 'Invalid candidate for this election' });
    }

    // Check one vote per voter per election (DB unique index also enforces this)
    const existing = await Ballot.findOne({ electionId, voterId: req.user.userId });
    if (existing) {
      return res.status(409).json({ error: 'You have already voted in this election' });
    }

    // Create ballot
    const nonce = uuidv4();
    const ballotHash = sha256(`${req.user.userId}${electionId}${candidateId}${nonce}`);

    // Hash the IP for privacy-preserving fraud detection
    const rawIp = req.ip || req.connection?.remoteAddress || '';
    const voterIpHash = sha256(rawIp);

    const ballot = new Ballot({
      electionId,
      voterId: req.user.userId,
      candidateId,
      ballotHash,
      nonce,
      voterIpHash,
    });
    await ballot.save();

    // Update election vote count
    await Election.findByIdAndUpdate(electionId, { $inc: { totalVotes: 1 } });

    // Track that user voted in this election
    await User.findByIdAndUpdate(req.user.userId, {
      $addToSet: { votedIn: electionId },
      $set: { lastVotedAt: new Date() },
    });

    // Log ballot on blockchain
    let onChainTxHash = null;
    try {
      const voterIdHash = hexToBytes32(sha256(req.user.userId));
      const ballotHashBytes = hexToBytes32(ballotHash);
      const electionIdHash = hexToBytes32(sha256(electionId));
      onChainTxHash = await blockchainService.logBallotOnChain(voterIdHash, ballotHashBytes, electionIdHash);

      if (onChainTxHash) {
        ballot.onChainTxHash = onChainTxHash;
        await ballot.save();
      }
    } catch (e) {
      console.warn('Blockchain ballot logging failed (non-fatal):', e.message);
    }

    // Broadcast real-time update
    await broadcastBallotUpdate(electionId);

    res.status(201).json({
      message: 'Ballot cast successfully',
      ballot: {
        electionId: ballot.electionId,
        candidateName: validCandidate.name,
        ballotHash: ballot.ballotHash,
        onChainTxHash,
        createdAt: ballot.createdAt,
      },
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ error: 'You have already voted in this election' });
    }
    console.error('Ballot cast error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ballots/:electionId — get all ballots for an election (public, anonymized)
router.get('/:electionId', async (req, res) => {
  try {
    const ballots = await Ballot.find({ electionId: req.params.electionId })
      .select('candidateId ballotHash createdAt onChainTxHash')
      .sort({ createdAt: -1 });

    // Return anonymized — no voter IDs exposed
    const safe = ballots.map(b => ({
      candidateId: b.candidateId,
      ballotHash: b.ballotHash,
      onChainTxHash: b.onChainTxHash,
      createdAt: b.createdAt,
    }));
    res.json({ ballots: safe, total: safe.length });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/ballots/check/:electionId — check if current user has voted
router.get('/check/:electionId', authMiddleware, async (req, res) => {
  try {
    const ballot = await Ballot.findOne({
      electionId: req.params.electionId,
      voterId: req.user.userId,
    });
    res.json({ hasVoted: !!ballot, ballotHash: ballot?.ballotHash || null });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
