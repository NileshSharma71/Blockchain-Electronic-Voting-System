const mongoose = require('mongoose');

const ballotSchema = new mongoose.Schema({
  electionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Election', required: true },
  voterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, required: true },
  ballotHash: { type: String, required: true },
  nonce: { type: String, required: true },
  voterIpHash: { type: String, default: null },
  onChainTxHash: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

// One vote per voter per election — enforced at DB level
ballotSchema.index({ electionId: 1, voterId: 1 }, { unique: true });

module.exports = mongoose.model('Ballot', ballotSchema);
