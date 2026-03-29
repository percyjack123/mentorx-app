const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

const menteeAuth = auth(['mentee']);

// ── DASHBOARD ─────────────────────────────────────────────
router.get('/dashboard', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;

  try {
    const [studentRes, meetingsRes, moodRes, docsRes] = await Promise.all([
      db.query(
        `SELECT s.*, u.name, u.email 
         FROM students s 
         JOIN users u ON u.id = s.user_id 
         WHERE s.id = $1`,
        [studentId]
      ),
      db.query(
        `SELECT m.*, u.name AS mentor_name
         FROM meetings m
         JOIN mentors mt ON mt.id = m.mentor_id
         JOIN users u ON u.id = mt.user_id
         JOIN meeting_students ms ON ms.meeting_id = m.id
         WHERE ms.student_id = $1 AND m.date >= CURRENT_DATE
         ORDER BY m.date ASC, m.time ASC LIMIT 5`,
        [studentId]
      ),
      db.query(
        `SELECT * FROM check_ins 
         WHERE student_id = $1 
         ORDER BY submitted_at DESC LIMIT 14`,
        [studentId]
      ),
      db.query(
        `SELECT * FROM documents 
         WHERE student_id = $1 
         ORDER BY uploaded_at DESC`,
        [studentId]
      )
    ]);

    const student = studentRes.rows[0];

    // 🎯 Extract CGPA & Attendance from documents
    let cgpa = 0;
    let attendance = 0;

    docsRes.rows.forEach(doc => {
      if (doc.doc_type === 'grade') cgpa = doc.value || cgpa;
      if (doc.doc_type === 'attendance') attendance = doc.value || attendance;
    });

    // fallback (temporary)
    if (!cgpa) cgpa = student?.cgpa || 7.0;
    if (!attendance) attendance = student?.attendance || 75;

    // simple risk logic
    let riskScore = 0;
    let riskLevel = "Safe";

    if (cgpa < 6 || attendance < 60) {
      riskScore = 70;
      riskLevel = "High";
    } else if (cgpa < 7 || attendance < 75) {
      riskScore = 40;
      riskLevel = "Moderate";
    }

    res.json({
      student,
      upcomingMeetings: meetingsRes.rows,
      moodTrend: moodRes.rows,

      // ✅ NEW FIELDS (frontend needs these)
      cgpa,
      attendance,
      placementStatus: student?.placement_status || "Not Started",
      riskScore,
      riskLevel
    });

  } catch (err) {
    console.error('GET /mentee/dashboard:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PROFILE ───────────────────────────────────────────────
router.get('/profile', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.name, u.email FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
      [studentId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /mentee/profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CHECK-IN TODAY ────────────────────────────────────────
router.get('/checkin/today', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT * FROM check_ins WHERE student_id = $1 AND submitted_at::date = CURRENT_DATE ORDER BY submitted_at DESC LIMIT 1`,
      [studentId]
    );
    res.json({ submitted: rows.length > 0, checkin: rows[0] || null });
  } catch (err) {
    console.error('GET /mentee/checkin/today:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── SUBMIT CHECK-IN ───────────────────────────────────────
router.post('/checkin', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { mood, update } = req.body;
  const progress = req.body.progress || req.body.academicProgress;
  try {
    const { rows } = await db.query(
      `INSERT INTO check_ins (student_id, mood, update_text, academic_progress)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [studentId, mood, update || '', progress || '']
    );
    // Update student last_check_in
    await db.query(
      `UPDATE students SET last_check_in = CURRENT_DATE, mood = $1 WHERE id = $2`,
      [mood >= 4 ? 'Happy' : mood >= 3 ? 'Neutral' : mood >= 2 ? 'Stressed' : 'Sad', studentId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /mentee/checkin:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET CHECK-INS ─────────────────────────────────────────
router.get('/checkin', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT * FROM check_ins WHERE student_id = $1 ORDER BY submitted_at DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DOCUMENTS ────────────────────────────────────────────
router.get('/documents', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT * FROM documents WHERE student_id = $1 ORDER BY uploaded_at DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /mentee/documents:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── NOTIFICATIONS ───────────────────────────────────────
router.get('/notifications', menteeAuth, async (_req, res) => {
  res.json([]);
});

// ── LEAVES ────────────────────────────────────────────────
router.get('/leaves', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT * FROM leave_records WHERE student_id = $1 ORDER BY created_at DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/leaves', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { fromDate, toDate, reason, medicalDocUrl } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO leave_records (student_id, from_date, to_date, reason, medical_doc_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [studentId, fromDate, toDate, reason, medicalDocUrl || null]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /mentee/leaves:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DOCUMENTS ─────────────────────────────────────────────
router.get('/documents', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT * FROM documents WHERE student_id = $1 ORDER BY uploaded_at DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/documents', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { title, description, fileUrl, docType } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO documents (student_id, title, description, file_url, doc_type, status, suspicion_score)
       VALUES ($1, $2, $3, $4, $5, 'Clean', 0) RETURNING *`,
      [studentId, title, description || null, fileUrl, docType || 'other']
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /mentee/documents:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/documents/:id', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    await db.query(
      `DELETE FROM documents WHERE id = $1 AND student_id = $2`,
      [req.params.id, studentId]
    );
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── NOTIFICATIONS ─────────────────────────────────────────
router.get('/notifications', menteeAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GOALS ─────────────────────────────────────────────────
router.get('/goals', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT g.*,
         COALESCE(json_agg(
           json_build_object('id', gt.id, 'title', gt.title, 'completed', gt.completed)
           ORDER BY gt.id
         ) FILTER (WHERE gt.id IS NOT NULL), '[]') AS tasks
       FROM goals g
       LEFT JOIN goal_tasks gt ON gt.goal_id = g.id
       WHERE g.student_id = $1
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /mentee/goals:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/goals/:goalId/tasks/:taskId', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { goalId, taskId } = req.params;
  const { completed } = req.body;
  try {
    // Verify goal belongs to student
    const goalCheck = await db.query(
      `SELECT id FROM goals WHERE id = $1 AND student_id = $2`,
      [goalId, studentId]
    );
    if (!goalCheck.rows.length) return res.status(404).json({ error: 'Goal not found' });

    await db.query(
      `UPDATE goal_tasks SET completed = $1 WHERE id = $2 AND goal_id = $3`,
      [completed, taskId, goalId]
    );

    // Recalculate progress
    const tasks = await db.query(
      `SELECT completed FROM goal_tasks WHERE goal_id = $1`,
      [goalId]
    );
    const total = tasks.rows.length;
    const done = tasks.rows.filter(t => t.completed).length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const isCompleted = progress === 100;

    const updated = await db.query(
      `UPDATE goals SET progress = $1, completed = $2 WHERE id = $3 RETURNING *`,
      [progress, isCompleted, goalId]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error('PUT /mentee/goals task:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── RESOURCES ─────────────────────────────────────────────
router.get('/resources', menteeAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.name AS uploaded_by_name
       FROM resources r JOIN users u ON u.id = r.uploaded_by
       ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── SKILL LOG ─────────────────────────────────────────────
router.get('/skills', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT * FROM skill_entries WHERE student_id = $1 ORDER BY entry_date DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/skills', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { type, title, description, link, entryDate } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO skill_entries (student_id, type, title, description, link, entry_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [studentId, type, title, description || null, link || null, entryDate || new Date().toISOString().split('T')[0]]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /mentee/skills:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── FEEDBACK ──────────────────────────────────────────────
router.post('/feedback', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { rating, comment } = req.body;
  try {
    // Get mentor_id for this student
    const studentRes = await db.query(`SELECT mentor_id FROM students WHERE id = $1`, [studentId]);
    const mentorId = studentRes.rows[0]?.mentor_id;
    if (!mentorId) return res.status(400).json({ error: 'No mentor assigned' });

    const { rows } = await db.query(
      `INSERT INTO feedback_entries (student_id, mentor_id, rating, comment) VALUES ($1,$2,$3,$4) RETURNING *`,
      [studentId, mentorId, rating, comment]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /mentee/feedback:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CONCERN ───────────────────────────────────────────────
router.post('/concern', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { content, anonymous } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO concerns (student_id, content, anonymous) VALUES ($1,$2,$3) RETURNING id`,
      [studentId, content, anonymous || false]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /mentee/concern:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── HEALTH ────────────────────────────────────────────────
router.get('/health', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(`SELECT * FROM health_info WHERE student_id = $1`, [studentId]);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/health', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { bloodGroup, chronicConditions, insuranceInfo, emergencyContacts } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO health_info (student_id, blood_group, chronic_conditions, insurance_info, emergency_contacts)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (student_id) DO UPDATE SET
         blood_group = $2, chronic_conditions = $3, insurance_info = $4,
         emergency_contacts = $5, updated_at = NOW()
       RETURNING *`,
      [studentId, bloodGroup, chronicConditions, insuranceInfo, JSON.stringify(emergencyContacts || [])]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /mentee/health:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── SOS ───────────────────────────────────────────────────
router.post('/sos', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `INSERT INTO sos_alerts (student_id) VALUES ($1) RETURNING id`,
      [studentId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /mentee/sos:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;