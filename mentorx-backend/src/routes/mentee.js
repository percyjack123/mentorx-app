const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

// ✅ SUBMIT CHECK-IN
router.post('/checkin', auth(['mentee']), async (req, res) => {
  try {
    const studentId = req.user.roleId;
    const { mood, shortUpdate, academicProgress } = req.body;

    await db.query(
      `INSERT INTO check_ins (student_id, mood, update_text, academic_progress)
       VALUES ($1, $2, $3, $4)`,
      [studentId, mood, shortUpdate, academicProgress]
    );

    res.json({ message: 'Check-in submitted successfully' });

  } catch (err) {
    console.error("❌ CHECKIN ERROR:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ FETCH CHECK-INS
router.get('/checkin', auth(['mentee']), async (req, res) => {
  try {
    const studentId = req.user.roleId;

    const { rows } = await db.query(
      `SELECT * FROM check_ins
       WHERE student_id = $1
       ORDER BY submitted_at DESC`,
      [studentId]
    );

    res.json(rows);

  } catch (err) {
    console.error("❌ FETCH ERROR:", err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;