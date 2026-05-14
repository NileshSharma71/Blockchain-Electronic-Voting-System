const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Ballot = require('../models/Ballot');
const { authMiddleware } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { toSafeUser } = require('../utils/userView');

const router = express.Router();
const JWT_EXPIRY = '7d';

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      isVerified: user.isVerified,
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

// POST /api/auth/register — email/password registration
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }

    if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = new User({
      username,
      email,
      passwordHash,
      role: 'voter',
      isVerified: false,
    });
    await user.save();

    const token = signToken(user);
    res.status(201).json({ token, user: toSafeUser(user) });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login — email/password login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: toSafeUser(user) });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me — current user info
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(toSafeUser(user));
  } catch (e) {
    console.error('Auth /me error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/my-ballots — current user's voting history
router.get('/my-ballots', authMiddleware, async (req, res) => {
  try {
    const ballots = await Ballot.find({ voterId: req.user.userId })
      .populate('electionId', 'title status')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(ballots);
  } catch (e) {
    console.error('Auth /my-ballots error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
