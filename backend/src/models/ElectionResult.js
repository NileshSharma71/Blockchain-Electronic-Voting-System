const mongoose = require('mongoose');

const candidateResultSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, required: true },
  candidateName: { type: String, required: true },
  voteCount: { type: Number, default: 0 },
}, { _id: false });

const electionResultSchema = new mongoose.Schema({
  electionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true, unique: true },
  results: [candidateResultSchema],
  totalVotes: { type: Number, default: 0 },
  winnerId: { type: mongoose.Schema.Types.ObjectId, default: null },
  winnerName: { type: String, default: null },
  resultProofHash: { type: String, required: true },
  onChainTxHash: { type: String, default: null },
  tallyMethod: { type: String, enum: ['automatic', 'manual'], default: 'automatic' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ElectionResult', electionResultSchema);
