const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

const menteeAuth = auth(['mentee', 'admin']);

router.get('/dashboard', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;

  const { rows } = await db.query(
    `SELECT * FROM students WHERE id = $1`,
    [studentId]
  );

  res.json({ student: rows[0] || null });
});

module.exports = router;