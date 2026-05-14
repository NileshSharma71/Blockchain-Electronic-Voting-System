const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: null },
  role: { type: String, enum: ['voter', 'admin'], default: 'voter' },
  isVerified: { type: Boolean, default: false },
  // 'pending' | 'verified' | 'rejected'
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  verificationNote: { type: String, default: '' },
  votedIn: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Election' }],
  lastVotedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
