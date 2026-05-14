const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  party: { type: String, default: '' },
}, { _id: true });

const electionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  candidates: {
    type: [candidateSchema],
    validate: {
      validator: function (arr) { return arr.length >= 2; },
      message: 'An election must have at least 2 candidates',
    },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed'],
    default: 'upcoming',
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  totalVotes: { type: Number, default: 0 },
  contentHash: { type: String, required: true, unique: true },
  resultProofHash: { type: String, default: null },
  onChainTxHash: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  finalizedAt: { type: Date, default: null },
});

// Auto-update status based on time
electionSchema.methods.computeStatus = function () {
  const now = new Date();
  if (now < this.startTime) return 'upcoming';
  if (now >= this.startTime && now <= this.endTime) return 'active';
  return 'completed';
};

module.exports = mongoose.model('Election', electionSchema);
