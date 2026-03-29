const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');

const adminOnly = auth(['admin']);

// ================= DASHBOARD =================
router.get('/dashboard', adminOnly, async (req, res) => {
  try {
    const [students, mentors, risk, cgpa] = await Promise.all([
      db.query('SELECT COUNT(*) FROM students'),
      db.query('SELECT COUNT(*) FROM mentors'),
      db.query("SELECT COUNT(*) FROM students WHERE risk_level != 'Safe'"),
      db.query('SELECT AVG(cgpa) FROM students'),
    ]);

    const avgCgpa = cgpa.rows[0].avg
      ? parseFloat(parseFloat(cgpa.rows[0].avg).toFixed(2))
      : 0;

    res.json({
      totalStudents: parseInt(students.rows[0].count),
      totalMentors: parseInt(mentors.rows[0].count),
      studentsAtRisk: parseInt(risk.rows[0].count),
      averageCGPA: avgCgpa,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= GET MENTORS =================
router.get('/mentors', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT m.id, u.name, u.email, m.department
      FROM mentors m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= GET STUDENTS =================
router.get('/students', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT s.*, u.name, u.email
      FROM students s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= CREATE USER =================
router.post('/users', adminOnly, async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    const user = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [name, email, hash, role]
    );

    res.status(201).json({ userId: user.rows[0].id });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= DELETE USER =================
router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;