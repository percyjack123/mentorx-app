const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

const mentorAuth = auth(['mentor', 'admin']);

router.get('/mentees/:id', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;

  const student = await db.query(
    `SELECT * FROM students WHERE id=$1 AND mentor_id=$2`,
    [req.params.id, mentorId]
  );

  if (!student.rows.length)
    return res.status(404).json({ error: 'Not found' });

  res.json(student.rows[0]);
});

module.exports = router;