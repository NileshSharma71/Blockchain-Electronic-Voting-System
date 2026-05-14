const Ballot = require('../models/Ballot');
const Election = require('../models/Election');
const ElectionResult = require('../models/ElectionResult');
const blockchainService = require('./blockchainService');
const { sha256, hexToBytes32 } = require('../utils/hash');

/**
 * Tally all ballots for an election and produce the final result.
 * - Counts votes per candidate
 * - Determines the winner
 * - Hashes the result and logs it on-chain
 * - Returns the ElectionResult document
 */
async function tallyElection(electionId) {
  const election = await Election.findById(electionId);
  if (!election) throw new Error('Election not found');

  // Check if already tallied
  const existing = await ElectionResult.findOne({ electionId });
  if (existing) return existing;

  // Count votes per candidate
  const ballots = await Ballot.find({ electionId });
  const voteCounts = {};

  for (const candidate of election.candidates) {
    voteCounts[candidate._id.toString()] = {
      candidateId: candidate._id,
      candidateName: candidate.name,
      voteCount: 0,
    };
  }

  for (const ballot of ballots) {
    const key = ballot.candidateId.toString();
    if (voteCounts[key]) {
      voteCounts[key].voteCount += 1;
    }
  }

  const results = Object.values(voteCounts).sort((a, b) => b.voteCount - a.voteCount);
  const totalVotes = ballots.length;

  // Determine winner (highest vote count; null if tie at top or no votes)
  let winnerId = null;
  let winnerName = null;
  if (results.length > 0 && totalVotes > 0) {
    if (results.length === 1 || results[0].voteCount > results[1].voteCount) {
      winnerId = results[0].candidateId;
      winnerName = results[0].candidateName;
    }
  }

  // Build proof hash: hash(electionId + candidate1:count1 + candidate2:count2 + ...)
  const proofParts = results.map(r => `${r.candidateId}:${r.voteCount}`).join('|');
  const proofString = `${electionId}:${proofParts}:total:${totalVotes}`;
  const resultProofHash = sha256(proofString);

  // Log result on-chain
  let onChainTxHash = null;
  try {
    const electionIdHash = hexToBytes32(sha256(electionId.toString()));
    const resultHashBytes = hexToBytes32(resultProofHash);
    onChainTxHash = await blockchainService.logResultOnChain(electionIdHash, resultHashBytes);
  } catch (e) {
    console.warn('Failed to log election result to blockchain:', e.message);
  }

  // Create result document
  const electionResult = await ElectionResult.create({
    electionId,
    results,
    totalVotes,
    winnerId,
    winnerName,
    resultProofHash,
    onChainTxHash,
  });

  // Update election status
  election.status = 'completed';
  election.resultProofHash = resultProofHash;
  election.onChainTxHash = onChainTxHash;
  election.finalizedAt = new Date();
  election.totalVotes = totalVotes;
  await election.save();

  return electionResult;
}

module.exports = { tallyElection };
