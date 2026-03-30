const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const menteeAuth = auth(['mentee']);

/**
 * POST /api/feedback
 * Payload: { rating: number, comment: string }
 */
router.post('/', menteeAuth, async (req, res) => {
  const menteeId = req.user.roleId;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    const studentRes = await db.query(
      'SELECT mentor_id FROM students WHERE id = $1', 
      [menteeId]
    );
    const mentorId = studentRes.rows[0]?.mentor_id;

    if (!mentorId) {
      return res.status(400).json({ error: 'No mentor assigned to this mentee' });
    }

    const { rows } = await db.query(
      `INSERT INTO feedback_entries (student_id, mentor_id, rating, comment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [menteeId, mentorId, rating, comment || '']
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Feedback Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/feedback/mentor/:mentorId
 * Returns all feedback for a specific mentor.
 */
router.get('/mentor/:mentorId', auth(['mentor', 'admin']), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT fe.*, u.name AS student_name 
       FROM feedback_entries fe
       JOIN students s ON s.id = fe.student_id
       JOIN users u ON u.id = s.user_id
       WHERE fe.mentor_id = $1
       ORDER BY fe.created_at DESC`,
      [req.params.mentorId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/feedback/mentor:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
