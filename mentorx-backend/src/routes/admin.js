const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');

const adminOnly = auth(['admin']);

// ── DASHBOARD ────────────────────────────────────────────
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
      averageCGPA: cgpa.rows[0].avg ? parseFloat(parseFloat(cgpa.rows[0].avg).toFixed(2)) : 0,
    });
  } catch (err) {
    console.error('GET /admin/dashboard:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET MENTORS ───────────────────────────────────────────
router.get('/mentors', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.id, u.name, u.email, m.department,
         ARRAY(SELECT s.id FROM students s WHERE s.mentor_id = m.id) AS student_ids
       FROM mentors m JOIN users u ON m.user_id = u.id ORDER BY m.id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET MENTOR + STUDENTS ─────────────────────────────────
router.get('/mentors/:id/students', adminOnly, async (req, res) => {
  try {
    const mentorRes = await db.query(
      `SELECT m.id, u.name, u.email, m.department FROM mentors m JOIN users u ON m.user_id = u.id WHERE m.id = $1`,
      [req.params.id]
    );
    if (!mentorRes.rows.length) return res.status(404).json({ error: 'Mentor not found' });

    const studentsRes = await db.query(
      `SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.mentor_id = $1 ORDER BY u.name`,
      [req.params.id]
    );
    res.json({ mentor: mentorRes.rows[0], students: studentsRes.rows });
  } catch (err) {
    console.error('GET /admin/mentors/:id/students:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET STUDENTS ──────────────────────────────────────────
router.get('/students', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id ORDER BY s.id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ANALYTICS ─────────────────────────────────────────────
router.get('/analytics', adminOnly, async (req, res) => {
  try {
    const [riskDist, cgpaTrends, attendanceDist] = await Promise.all([
      db.query(`SELECT risk_level AS name, COUNT(*) AS value FROM students GROUP BY risk_level`),
      db.query(`SELECT semester, ROUND(AVG(cgpa)::numeric,2) AS cgpa FROM students GROUP BY semester ORDER BY semester`),
      db.query(`
        SELECT
          CASE
            WHEN attendance >= 90 THEN '90-100%'
            WHEN attendance >= 80 THEN '80-89%'
            WHEN attendance >= 70 THEN '70-79%'
            WHEN attendance >= 60 THEN '60-69%'
            ELSE '<60%'
          END AS range,
          COUNT(*) AS count
        FROM students GROUP BY range`),
    ]);
    res.json({
      riskDistribution: riskDist.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
      cgpaTrends: cgpaTrends.rows.map(r => ({ semester: `Sem ${r.semester}`, cgpa: parseFloat(r.cgpa) })),
      attendanceDistribution: attendanceDist.rows.map(r => ({ range: r.range, count: parseInt(r.count) })),
    });
  } catch (err) {
    console.error('GET /admin/analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── FEEDBACK ──────────────────────────────────────────────
router.get('/feedback', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT fe.*, mu.name AS mentor_name, m.department
       FROM feedback_entries fe
       JOIN mentors m ON m.id = fe.mentor_id
       JOIN users mu ON mu.id = m.user_id
       ORDER BY fe.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /admin/feedback:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CREATE USER ───────────────────────────────────────────
router.post('/users', adminOnly, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await db.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id`,
      [name, email, hash, role]
    );
    res.status(201).json({ userId: user.rows[0].id });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE USER ───────────────────────────────────────────
router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;