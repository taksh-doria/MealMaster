import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Helper to safely read trimmed strings
function getTrimmed(obj, key, def = '') {
  const val = obj && typeof obj[key] === 'string' ? obj[key].trim() : def;
  return val;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // Guard against missing/invalid body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid JSON body' });
    }

    const name = getTrimmed(req.body, 'name', '');
    const email = getTrimmed(req.body, 'email', '').toLowerCase();
    const password = getTrimmed(req.body, 'password', '');

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    // Optional: Basic email/password sanity check
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Uniqueness check
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    const token = signToken(user);
    return res.status(201).json({
      success: true,
      data: {
        token,
        user: { _id: user._id, email: user.email, name: user.name, role: user.role }
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Registration failed', error: e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    
    if (!req.body || typeof req.body !== 'object') {
        console.log('Invalid request body:', req.body);
      return res.status(400).json({ success: false, message: 'Invalid JSON body' });
    }

    const email = getTrimmed(req.body, 'email', '').toLowerCase();
    const password = getTrimmed(req.body, 'password', '');

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = signToken(user);
    return res.json({
      success: true,
      data: { token, user: { _id: user._id, email: user.email, name: user.name, role: user.role } }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Login failed', error: e.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).select('_id email name role');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: user });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Failed to load profile', error: e.message });
  }
});

export default router;
