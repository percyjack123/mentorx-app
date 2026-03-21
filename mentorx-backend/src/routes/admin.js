const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');

const adminOnly = auth(['admin']);

// GET /api/admin/dashboard
router.get('/dashboard', adminOnly, async (req, res) => {
  try {
    const [students, mentors, risk, cgpa] = await Promise.all([
      db.query('SELECT COUNT(*) FROM students'),
      db.query('SELECT COUNT(*) FROM mentors'),
      db.query("SELECT COUNT(*) FROM students WHERE risk_level != 'Safe'"),
      db.query('SELECT AVG(cgpa) FROM students'),
    ]);
    res.json({
      totalStudents: parseInt(students.rows[0].count),
      totalMentors: parseInt(mentors.rows[0].count),
      studentsAtRisk: parseInt(risk.rows[0].count),
      averageCGPA: parseFloat(parseFloat(cgpa.rows[0].avg).toFixed(2)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/mentors
router.get('/mentors', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT m.id, u.name, u.email, m.department,
        ARRAY_AGG(s.id) FILTER (WHERE s.id IS NOT NULL) as student_ids
      FROM mentors m
      JOIN users u ON m.user_id = u.id
      LEFT JOIN students s ON s.mentor_id = m.id
      GROUP BY m.id, u.name, u.email, m.department
      ORDER BY m.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/mentors/:id/students
router.get('/mentors/:id/students', adminOnly, async (req, res) => {
  try {
    const mentor = await db.query(
      `SELECT m.id, u.name, u.email, m.department FROM mentors m JOIN users u ON m.user_id = u.id WHERE m.id = $1`,
      [req.params.id]
    );
    if (!mentor.rows.length) return res.status(404).json({ error: 'Mentor not found' });

    const { rows } = await db.query(`
      SELECT s.*, u.name, u.email FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.mentor_id = $1
    `, [req.params.id]);

    res.json({ mentor: mentor.rows[0], students: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/students
router.get('/students', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT s.*, u.name, u.email FROM students s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users — create any user
router.post('/users', adminOnly, async (req, res) => {
  const { name, email, password, role, department } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'name, email, password, role required' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const userRes = await db.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id`,
      [name, email, hash, role]
    );
    const userId = userRes.rows[0].id;

    if (role === 'mentor') {
      await db.query(`INSERT INTO mentors (user_id, department) VALUES ($1,$2)`, [userId, department]);
    } else if (role === 'mentee') {
      await db.query(`INSERT INTO students (user_id, department) VALUES ($1,$2)`, [userId, department]);
    }

    res.status(201).json({ message: 'User created', userId });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/students/:studentId/assign-mentor
router.put('/students/:studentId/assign-mentor', adminOnly, async (req, res) => {
  const { mentorId } = req.body;
  try {
    await db.query('UPDATE students SET mentor_id = $1 WHERE id = $2', [mentorId, req.params.studentId]);
    res.json({ message: 'Mentor assigned' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/analytics
router.get('/analytics', adminOnly, async (req, res) => {
  try {
    const [riskDist, cgpaTrend, attendanceDist, feedbackStats] = await Promise.all([
      db.query(`SELECT risk_level as name, COUNT(*) as value FROM students GROUP BY risk_level`),
      db.query(`SELECT semester, AVG(cgpa) as cgpa FROM students GROUP BY semester ORDER BY semester`),
      db.query(`
        SELECT
          CASE
            WHEN attendance >= 90 THEN '90-100%'
            WHEN attendance >= 80 THEN '80-89%'
            WHEN attendance >= 70 THEN '70-79%'
            WHEN attendance >= 60 THEN '60-69%'
            ELSE '<60%'
          END as range,
          COUNT(*) as count
        FROM students GROUP BY 1 ORDER BY 1
      `),
      db.query(`SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM feedback_entries`),
    ]);

    res.json({
      riskDistribution: riskDist.rows,
      cgpaTrends: cgpaTrend.rows,
      attendanceDistribution: attendanceDist.rows,
      feedbackStats: feedbackStats.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/feedback
router.get('/feedback', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT fe.*, u.name as mentor_name, m.department
      FROM feedback_entries fe
      JOIN mentors m ON fe.mentor_id = m.id
      JOIN users u ON m.user_id = u.id
      ORDER BY fe.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;