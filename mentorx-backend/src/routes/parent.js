const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

const parentAuth = auth(['parent', 'admin']);

router.get('/dashboard', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;

  const { rows } = await db.query(`
    SELECT s.*
    FROM students s
    JOIN parents p ON p.student_id = s.id
    WHERE p.id = $1
  `, [parentId]);

  res.json({ student: rows[0] || null });
});

module.exports = router;