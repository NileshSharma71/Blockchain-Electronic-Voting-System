const express = require('express');
const ElectionResult = require('../models/ElectionResult');
const { tallyElection } = require('../services/tallyService');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/results/:electionId — get result for a specific election
router.get('/:electionId', async (req, res) => {
  try {
    const result = await ElectionResult.findOne({ electionId: req.params.electionId });
    if (!result) return res.status(404).json({ error: 'Results not yet available for this election' });
    res.json(result);
  } catch (e) {
    console.error('Results route error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/results — list all results (paginated)
router.get('/', async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    page = Math.max(1, Math.min(page, 1000));
    const limit = 20;
    const skip = (page - 1) * limit;

    const total = await ElectionResult.countDocuments();
    const results = await ElectionResult.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('electionId', 'title');

    res.json({ results, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/results/:electionId/tally — manually trigger tally (admin only)
router.post('/:electionId/tally', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await tallyElection(req.params.electionId);
    res.json(result);
  } catch (e) {
    console.error('Manual tally error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
