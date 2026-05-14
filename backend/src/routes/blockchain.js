const express = require('express');
const Ballot = require('../models/Ballot');
const blockchainService = require('../services/blockchainService');

const router = express.Router();

// GET /api/blockchain/health
router.get('/health', async (req, res) => {
  try { res.json(await blockchainService.getHealth()); }
  catch (e) { res.status(503).json({ connected: false, error: e.message }); }
});

// GET /api/blockchain/stats
router.get('/stats', async (req, res) => {
  try {
    const chainStats = await blockchainService.getStats();
    const totalOffChainBallots = await Ballot.countDocuments();

    res.json({
      ...chainStats,
      totalOffChainBallots,
    });
  }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/blockchain/ballots — on-chain ballot audit logs
router.get('/ballots', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 25));

    const result = await blockchainService.getBallotEvents(page, limit);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/blockchain/results — on-chain election result audit logs
router.get('/results', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 25));

    const result = await blockchainService.getResultEvents(page, limit);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
