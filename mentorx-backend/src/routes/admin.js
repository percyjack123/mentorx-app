const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');

const adminOnly = auth(['admin']);

async function createNotification(userId, type, message) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)`,
      [userId, type, message]
    );
  } catch (_) {}
}

// ── DASHBOARD ─────────────────────────────────────────────
router.get('/dashboard', adminOnly, async (req, res) => {
  try {
    const [students, mentors, risk, cgpa] = await Promise.all([
      db.query('SELECT COUNT(*) FROM students'),
      db.query('SELECT COUNT(*) FROM mentors WHERE status = $1', ['Active']),
      db.query(`SELECT COUNT(*) FROM students WHERE risk_level != 'Safe'`),
      db.query('SELECT AVG(cgpa) FROM students'),
    ]);
    res.json({
      totalStudents:  parseInt(students.rows[0].count),
      totalMentors:   parseInt(mentors.rows[0].count),
      studentsAtRisk: parseInt(risk.rows[0].count),
      averageCGPA:    cgpa.rows[0].avg ? parseFloat(parseFloat(cgpa.rows[0].avg).toFixed(2)) : 0,
    });
  } catch (err) {
    console.error('GET /admin/dashboard:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── MENTORS LIST ──────────────────────────────────────────
router.get('/mentors', adminOnly, async (req, res) => {
  const statusFilter = req.query.status ? String(req.query.status) : null;
  const params = [];
  let where = '';
  if (statusFilter) { params.push(statusFilter); where = 'WHERE m.status = $1'; }
  try {
    const { rows } = await db.query(
      `SELECT m.id, u.name, u.email, m.department, m.status,
         ARRAY(SELECT s.id FROM students s WHERE s.mentor_id = m.id) AS student_ids
       FROM mentors m JOIN users u ON m.user_id = u.id ${where} ORDER BY m.id`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /admin/mentors:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── PENDING MENTOR APPROVALS ──────────────────────────────
router.get('/mentors/pending', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.id, u.name, u.email, m.department, m.status, m.created_at
       FROM mentors m JOIN users u ON m.user_id = u.id
       WHERE m.status = 'Pending' ORDER BY m.created_at ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /admin/mentors/pending:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── APPROVE MENTOR ────────────────────────────────────────
router.put('/mentors/:id/approve', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE mentors SET status = 'Active' WHERE id = $1 RETURNING *, user_id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Mentor not found' });

    // Mark email as verified for mentor login (admin approval completes verification in this system)
    await db.query(`UPDATE users SET "isVerified" = TRUE WHERE id = $1`, [rows[0].user_id]);
    await createNotification(rows[0].user_id, 'system',
      'Your mentor registration has been approved. You can now log in.');
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /admin/mentors/:id/approve:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── REJECT MENTOR ─────────────────────────────────────────
router.put('/mentors/:id/reject', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE mentors SET status = 'Rejected' WHERE id = $1 RETURNING *, user_id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Mentor not found' });

    await db.query(`UPDATE users SET "isVerified" = FALSE WHERE id = $1`, [rows[0].user_id]);
    await createNotification(rows[0].user_id, 'system',
      'Your mentor registration was not approved.');
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /admin/mentors/:id/reject:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── MENTOR + STUDENTS ─────────────────────────────────────
router.get('/mentors/:id/students', adminOnly, async (req, res) => {
  try {
    const mentorRes = await db.query(
      `SELECT m.id, u.name, u.email, m.department, m.status
       FROM mentors m JOIN users u ON m.user_id = u.id WHERE m.id = $1`,
      [req.params.id]
    );
    if (!mentorRes.rows.length) return res.status(404).json({ error: 'Mentor not found' });
    const studentsRes = await db.query(
      `SELECT s.*, u.name, u.email FROM students s
       JOIN users u ON s.user_id = u.id WHERE s.mentor_id = $1 ORDER BY u.name`,
      [req.params.id]
    );
    res.json({ mentor: mentorRes.rows[0], students: studentsRes.rows });
  } catch (err) {
    console.error('GET /admin/mentors/:id/students:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── STUDENTS ──────────────────────────────────────────────
router.get('/students', adminOnly, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.name, u.email FROM students s
       JOIN users u ON s.user_id = u.id ORDER BY s.id`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /admin/students:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── ANALYTICS ─────────────────────────────────────────────
router.get('/analytics', adminOnly, async (req, res) => {
  try {
    const [riskDist, cgpaTrends, attendanceDist] = await Promise.all([
      db.query(`SELECT risk_level AS name, COUNT(*) AS value FROM students GROUP BY risk_level`),
      db.query(
        `SELECT semester, ROUND(AVG(cgpa)::numeric,2) AS cgpa
         FROM students GROUP BY semester ORDER BY semester`
      ),
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
        FROM students GROUP BY range ORDER BY range`),
    ]);
    res.json({
      riskDistribution: riskDist.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
      cgpaTrends: cgpaTrends.rows.map(r => ({ semester: `Sem ${r.semester}`, cgpa: parseFloat(r.cgpa) })),
      attendanceDistribution: attendanceDist.rows.map(r => ({ range: r.range, count: parseInt(r.count) })),
    });
  } catch (err) {
    console.error('GET /admin/analytics:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
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
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── NOTIFICATIONS ─────────────────────────────────────────
router.get('/notifications', adminOnly, async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /admin/notifications:', err);
    res.json([]);
  }
});

// ── CREATE USER ───────────────────────────────────────────
router.post('/users', adminOnly, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).json({ error: 'Missing fields' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, "isVerified", "isApproved") 
       VALUES ($1,$2,$3,$4, TRUE, TRUE) RETURNING id`,
      [name, email, hash, role]
    );
    const userId = userRes.rows[0].id;

    if (role === 'mentee') {
      await client.query(`INSERT INTO students (user_id) VALUES ($1)`, [userId]);
    } else if (role === 'mentor') {
      await client.query(`INSERT INTO mentors (user_id, status) VALUES ($1, 'Active')`, [userId]);
    } else if (role === 'parent') {
      await client.query(`INSERT INTO parents (user_id) VALUES ($1)`, [userId]);
    }

    await client.query('COMMIT');
    res.status(201).json({ userId });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(400).json({ error: 'Email exists' });
    console.error('POST /admin/users:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  } finally {
    client.release();
  }
});

// ── CREATE MENTOR (admin-initiated) ──────────────────────
router.post('/mentors', adminOnly, async (req, res) => {
  const { name, email, password, department = null } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email, password required' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Email exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, "isVerified", "isApproved") VALUES ($1,$2,$3,'mentor', TRUE, TRUE) RETURNING id`,
      [name, email, hash]
    );
    const userId = userRes.rows[0].id;
    const mentorRes = await client.query(
      `INSERT INTO mentors (user_id, department, status) VALUES ($1,$2,'Active') RETURNING id`,
      [userId, department]
    );
    await client.query('COMMIT');
    res.status(201).json({ mentorId: mentorRes.rows[0].id, userId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /admin/mentors:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  } finally {
    client.release();
  }
});

// ── DELETE USER ───────────────────────────────────────────
router.delete('/users/:id', adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /admin/users/:id:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

module.exports = router;