const Election = require('../models/Election');
const { tallyElection } = require('./tallyService');
const { broadcastElectionResult } = require('./socketService');

// Check every 30 seconds for elections that need to be closed
const INTERVAL_MS = 30 * 1000;

async function checkAndCloseElections() {
  try {
    const now = new Date();

    // Find active elections whose endTime has passed
    const expiredElections = await Election.find({
      status: 'active',
      endTime: { $lte: now },
    });

    for (const election of expiredElections) {
      console.log(`[Cron] Auto-closing election: ${election.title}`);
      try {
        const result = await tallyElection(election._id);
        broadcastElectionResult(election._id, result);
        console.log(`[Cron] Election "${election.title}" tallied. Winner: ${result.winnerName || 'Tie'}`);
      } catch (e) {
        console.error(`[Cron] Failed to tally election ${election._id}:`, e.message);
      }
    }

    // Also activate upcoming elections whose startTime has passed
    const readyElections = await Election.find({
      status: 'upcoming',
      startTime: { $lte: now },
    });

    for (const election of readyElections) {
      election.status = 'active';
      await election.save();
      console.log(`[Cron] Activated election: ${election.title}`);
    }
  } catch (error) {
    console.error('[Cron] Election check failed:', error.message);
  }
}

function initCron() {
  console.log(`[Cron] Election monitor initialized (checking every ${INTERVAL_MS / 1000}s)`);
  setInterval(checkAndCloseElections, INTERVAL_MS);
  // Run once immediately at startup
  checkAndCloseElections();
}

module.exports = { initCron, checkAndCloseElections };
