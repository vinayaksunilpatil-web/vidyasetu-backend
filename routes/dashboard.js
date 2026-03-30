const express = require('express');
const router = express.Router();
const db = require('../db');

function requireNGO(req, res, next) {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Please login.' });
  if (req.session.user.role !== 'ngo') return res.status(403).json({ success: false, message: 'NGO access only.' });
  next();
}

// ─── GET /api/dashboard/ngo-summary ──────────────────────────
router.get('/ngo-summary', requireNGO, async (req, res) => {
  try {
    const [[donationTotals]] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total_donations, COUNT(*) as donation_count, COUNT(DISTINCT user_id) as unique_donors FROM donations WHERE status = "completed"'
    );
    const [[expenseTotals]] = await db.query(
      'SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as expense_count FROM expenses'
    );
    const [categoryFunds] = await db.query(
      'SELECT category, SUM(amount) as total FROM donations WHERE status = "completed" GROUP BY category ORDER BY total ASC'
    );
    const [recentDonors] = await db.query(
      `SELECT d.donor_name, d.amount, d.category, d.created_at, u.email
       FROM donations d JOIN users u ON d.user_id = u.id
       ORDER BY d.created_at DESC LIMIT 5`
    );
    const [timeline] = await db.query(
      `SELECT 'donation' as type, donor_name as name, amount, category, created_at FROM donations WHERE status = 'completed'
       UNION ALL
       SELECT 'expense' as type, expense_name as name, amount, category, created_at FROM expenses
       ORDER BY created_at DESC LIMIT 10`
    );

    const remaining = donationTotals.total_donations - expenseTotals.total_expenses;
    const trustIndex = donationTotals.total_donations > 0
      ? Math.min(100, Math.round((expenseTotals.total_expenses / donationTotals.total_donations) * 100))
      : 0;

    res.json({
      success: true,
      summary: {
        total_donations: donationTotals.total_donations,
        donation_count: donationTotals.donation_count,
        unique_donors: donationTotals.unique_donors,
        total_expenses: expenseTotals.total_expenses,
        expense_count: expenseTotals.expense_count,
        remaining_fund: remaining,
        trust_index: trustIndex
      },
      categoryFunds,
      recentDonors,
      timeline
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});
module.exports = router;