const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Election = require('../models/Election');
const Ballot = require('../models/Ballot');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { toSafeUser } = require('../utils/userView');

const router = express.Router();

function getPageAndSkip(pageStr, limit = 20) {
  let page = parseInt(pageStr) || 1;
  page = Math.max(1, Math.min(page, 1000));
  const skip = (page - 1) * limit;
  return { page, skip };
}

// GET /api/admin/users — list all users
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page, skip } = getPageAndSkip(req.query.page, 30);
    const limit = 30;
    const total = await User.countDocuments();
    const users = await User.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    res.json({ users: users.map(toSafeUser), total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/pending-users — list unverified users (excludes rejected)
router.get('/pending-users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ isVerified: false, verificationStatus: { $ne: 'rejected' } })
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    res.json({ users: users.map(toSafeUser) });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/verify-user/:userId — approve a pending voter
router.post('/verify-user/:userId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { note } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.isVerified) return res.status(400).json({ error: 'User already verified' });

    user.isVerified = true;
    user.verificationStatus = 'verified';
    user.verificationNote = note || `Verified by admin on ${new Date().toISOString()}`;
    await user.save();

    res.json({ message: 'User verified successfully', user: { id: user._id, username: user.username, isVerified: true } });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/reject-user/:userId — reject a pending voter
router.post('/reject-user/:userId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.verificationStatus = 'rejected'; // ← key fix: marks as rejected so it leaves the pending queue
    user.verificationNote = `Rejected: ${reason || 'No reason provided'}`;
    await user.save();

    res.json({ message: 'User rejected', user: { id: user._id, username: user.username, verificationStatus: 'rejected' } });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/add-user — manually add a verified user
router.post('/add-user', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(409).json({ error: 'Username or email already taken' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = new User({
      username,
      email,
      passwordHash,
      role: role === 'admin' ? 'admin' : 'voter',
      isVerified: true,
    });
    await user.save();

    res.status(201).json({ id: user._id, username, email, role: user.role, isVerified: true });
  } catch (e) {
    console.error('Add user error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/stats — dashboard stats
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [totalUsers, totalElections, totalBallots, activeElections, pendingUsers] = await Promise.all([
      User.countDocuments(),
      Election.countDocuments(),
      Ballot.countDocuments(),
      Election.countDocuments({ status: 'active' }),
      User.countDocuments({ isVerified: false, verificationStatus: { $ne: 'rejected' } }),
    ]);
    res.json({ totalUsers, totalElections, totalBallots, activeElections, pendingUsers });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
