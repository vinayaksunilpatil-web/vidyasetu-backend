const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendDonationReceipt } = require('../utils/email');

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Please login first.' });
  next();
}

// Generate receipt ID
function generateReceiptId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `VS-${date}-${rand}`;
}

// ─── POST /api/donation/add ───────────────────────────────────
router.post('/add', requireAuth, async (req, res) => {
  const { amount, category, payment_method } = req.body;
  const user = req.session.user;

  if (!amount || !category) {
    return res.status(400).json({ success: false, message: 'Amount and category required.' });
  }
  if (isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount.' });
  }

  try {
    const receiptId = generateReceiptId();

    await db.query(
      'INSERT INTO donations (user_id, donor_name, amount, category, payment_method, status, receipt_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.id, user.name, parseFloat(amount), category, payment_method || 'UPI', 'completed', receiptId]
    );

    // Send receipt email (non-blocking)
    sendDonationReceipt(user.email, user.name, amount, category, receiptId).catch(err => {
      console.log('Receipt email failed (non-critical):', err.message);
    });

    res.json({
      success: true,
      message: 'Donation recorded successfully!',
      receiptId,
      impactMessage: `Your ₹${amount} donation to ${category} could help ${Math.floor(amount / 150)} student(s)!`
    });
  } catch (err) {
    console.error('Donation error:', err);
    res.status(500).json({ success: false, message: 'Failed to record donation.' });
  }
});

// ─── GET /api/donations/all (NGO only) ───────────────────────
router.get('/all', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'ngo') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  try {
    const [donations] = await db.query(
      `SELECT d.id, d.donor_name, d.amount, d.category, d.payment_method, d.status, d.receipt_id, d.created_at,
              u.email as donor_email
       FROM donations d JOIN users u ON d.user_id = u.id
       ORDER BY d.created_at DESC`
    );
    res.json({ success: true, donations });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/donations/mine ──────────────────────────────────
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const [donations] = await db.query(
      'SELECT * FROM donations WHERE user_id = ? ORDER BY created_at DESC',
      [req.session.user.id]
    );
    res.json({ success: true, donations });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/donations/stats (NGO) ──────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
  if (req.session.user.role !== 'ngo') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  try {
    const [totals] = await db.query('SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM donations WHERE status="completed"');
    const [byCategory] = await db.query('SELECT category, SUM(amount) as total FROM donations WHERE status="completed" GROUP BY category ORDER BY total DESC');
    const [monthly] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as total, COUNT(*) as count
       FROM donations WHERE status = 'completed'
       GROUP BY month ORDER BY month DESC LIMIT 6`
    );

    res.json({ success: true, totals: totals[0], byCategory, monthly });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/donations/my-stats ─────────────────────────────
router.get('/my-stats', requireAuth, async (req, res) => {
  try {
    const [totals] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM donations WHERE user_id = ? AND status = "completed"',
      [req.session.user.id]
    );
    const [byCategory] = await db.query(
      'SELECT category, SUM(amount) as total FROM donations WHERE user_id = ? AND status = "completed" GROUP BY category',
      [req.session.user.id]
    );
    const [monthly] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(amount) as total
       FROM donations WHERE user_id = ? AND status = 'completed'
       GROUP BY month ORDER BY month DESC LIMIT 6`,
      [req.session.user.id]
    );

    res.json({ success: true, totals: totals[0], byCategory, monthly });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;