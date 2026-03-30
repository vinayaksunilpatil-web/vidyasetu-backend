const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sendOTPEmail } = require('../utils/email');

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── POST /api/auth/signup ────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }

  try {
    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered. Please login.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'ngo' ? 'ngo' : 'donor';

    await db.query(
      'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, hashedPassword, userRole]
    );

    res.json({ success: true, message: 'Account created successfully! Please login.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Store email in session for OTP step
    req.session.pendingUser = { id: user.id, email: user.email, name: user.name, role: user.role };

    res.json({ success: true, message: 'Credentials verified. OTP will be sent.', email: user.email });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/send-otp ──────────────────────────────────
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email required.' });
  }

  try {
    // Check user exists
    const [users] = await db.query('SELECT name FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    // Invalidate old OTPs
    await db.query('UPDATE otps SET used = TRUE WHERE email = ? AND used = FALSE', [email]);

    // Save new OTP
    await db.query(
      'INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)',
      [email, otp, expiresAt]
    );

    // Send email
    await sendOTPEmail(email, otp, users[0].name);

    res.json({ success: true, message: `OTP sent to ${email}` });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Check email configuration.' });
  }
});

// ─── POST /api/auth/verify-otp ────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP required.' });
  }

  try {
    // Check OTP
    const [otpRecords] = await db.query(
      'SELECT * FROM otps WHERE email = ? AND otp = ? AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [email, otp]
    );

    if (otpRecords.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP. Please try again.' });
    }

    // Mark OTP as used
    await db.query('UPDATE otps SET used = TRUE WHERE id = ?', [otpRecords[0].id]);

    // Get user data
    const [users] = await db.query('SELECT id, name, email, role FROM users WHERE email = ?', [email]);
    const user = users[0];

    // Set session
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    req.session.pendingUser = null;

    res.json({
      success: true,
      message: 'Login successful!',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      redirect: user.role === 'ngo' ? '/ngo-dashboard' : '/donor-dashboard'
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out.' });
});

// ─── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', (req, res) => {
  if (req.session.user) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
});

const crypto = require('crypto');

// ─── POST /api/auth/forgot-password ──────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email required.' });
  }

  try {
    const [users] = await db.query(
      'SELECT id, name FROM users WHERE email = ?', [email]
    );

    if (users.length === 0) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If this email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate old tokens
    await db.query(
      'UPDATE password_resets SET used = TRUE WHERE email = ?', [email]
    );

    // Save new token
    await db.query(
      'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
      [email, token, expiresAt]
    );

    // Send reset email
    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    const { sendResetEmail } = require('../utils/email');
    await sendResetEmail(email, users[0].name, resetLink);

    res.json({ success: true, message: 'Reset link sent to your email!' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token and password required.' });
  }

  try {
    const [tokens] = await db.query(
      'SELECT * FROM password_resets WHERE token = ? AND used = FALSE AND expires_at > NOW()',
      [token]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    await db.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, tokens[0].email]
    );

    // Mark token as used
    await db.query(
      'UPDATE password_resets SET used = TRUE WHERE token = ?',
      [token]
    );

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;