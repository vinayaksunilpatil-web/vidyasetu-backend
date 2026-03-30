const express = require('express');
const router = express.Router();
const db = require('../db');

function requireNGO(req, res, next) {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Please login.' });
  if (req.session.user.role !== 'ngo') return res.status(403).json({ success: false, message: 'NGO access only.' });
  next();
}

// ─── POST /api/expense/add ────────────────────────────────────
router.post('/add', requireNGO, async (req, res) => {
  const { expense_name, amount, category, description } = req.body;

  if (!expense_name || !amount || !category) {
    return res.status(400).json({ success: false, message: 'Expense name, amount, and category required.' });
  }

  try {
    await db.query(
      'INSERT INTO expenses (added_by, expense_name, amount, category, description) VALUES (?, ?, ?, ?, ?)',
      [req.session.user.id, expense_name, parseFloat(amount), category, description || null]
    );
    res.json({ success: true, message: 'Expense added successfully.' });
  } catch (err) {
    console.error('Expense error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/expense/all ─────────────────────────────────────
router.get('/all', requireNGO, async (req, res) => {
  try {
    const [expenses] = await db.query(
      'SELECT * FROM expenses ORDER BY created_at DESC'
    );
    res.json({ success: true, expenses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;