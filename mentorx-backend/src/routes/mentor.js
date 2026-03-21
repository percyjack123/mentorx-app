const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

const mentorAuth = auth(['mentor', 'admin']);

// GET /api/mentor/dashboard
router.get('/dashboard', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;
  try {
    const [mentees, highRisk, pending, unsubmitted] = await Promise.all([
      db.query('SELECT COUNT(*) FROM students WHERE mentor_id = $1', [mentorId]),
      db.query("SELECT COUNT(*) FROM students WHERE mentor_id = $1 AND risk_level = 'High'", [mentorId]),
      db.query(`SELECT COUNT(*) FROM leave_records lr JOIN students s ON lr.student_id = s.id
                WHERE s.mentor_id = $1 AND lr.status = 'Pending'`, [mentorId]),
      db.query(`SELECT COUNT(*) FROM students WHERE mentor_id = $1 AND last_check_in < CURRENT_DATE - 2`, [mentorId]),
    ]);
    res.json({
      totalMentees: parseInt(mentees.rows[0].count),
      highRiskStudents: parseInt(highRisk.rows[0].count),
      pendingLeaves: parseInt(pending.rows[0].count),
      unsubmittedCheckIns: parseInt(unsubmitted.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/mentor/mentees
router.get('/mentees', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;
  try {
    const { rows } = await db.query(`
      SELECT s.*, u.name, u.email FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.mentor_id = $1
      ORDER BY s.risk_score DESC
    `, [mentorId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/mentor/mentees/:id
router.get('/mentees/:id', mentorAuth, async (req, res) => {
  try {
    const student = await db.query(`
      SELECT s.*, u.name, u.email FROM students s
      JOIN users u ON s.user_id = u.id WHERE s.id = $1
    `, [req.params.id]);
    if (!student.rows.length) return res.status(404).json({ error: 'Student not found' });

    const [checkins, leaves, docs, goals, skills, health] = await Promise.all([
      db.query('SELECT * FROM check_ins WHERE student_id = $1 ORDER BY submitted_at DESC LIMIT 10', [req.params.id]),
      db.query('SELECT * FROM leave_records WHERE student_id = $1 ORDER BY created_at DESC', [req.params.id]),
      db.query('SELECT * FROM documents WHERE student_id = $1 ORDER BY uploaded_at DESC', [req.params.id]),
      db.query(`SELECT g.*, json_agg(gt.*) as tasks FROM goals g
        LEFT JOIN goal_tasks gt ON gt.goal_id = g.id
        WHERE g.student_id = $1 GROUP BY g.id`, [req.params.id]),
      db.query('SELECT * FROM skill_entries WHERE student_id = $1 ORDER BY entry_date DESC', [req.params.id]),
      db.query('SELECT * FROM health_info WHERE student_id = $1', [req.params.id]),
    ]);

    res.json({
      student: student.rows[0],
      checkIns: checkins.rows,
      leaveRecords: leaves.rows,
      documents: docs.rows,
      goals: goals.rows,
      skillEntries: skills.rows,
      healthInfo: health.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/mentor/alerts
router.get('/alerts', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;
  try {
    const [highRisk, tampered, missedCheckins, sos] = await Promise.all([
      db.query(`SELECT s.id, u.name, s.risk_score FROM students s JOIN users u ON s.user_id = u.id
                WHERE s.mentor_id = $1 AND s.risk_level = 'High'`, [mentorId]),
      db.query(`SELECT s.id, u.name, d.title, d.status FROM students s
                JOIN users u ON s.user_id = u.id
                JOIN documents d ON d.student_id = s.id
                WHERE s.mentor_id = $1 AND d.status != 'Clean'`, [mentorId]),
      db.query(`SELECT s.id, u.name, s.last_check_in FROM students s JOIN users u ON s.user_id = u.id
                WHERE s.mentor_id = $1 AND (s.last_check_in IS NULL OR s.last_check_in < CURRENT_DATE - 2)`, [mentorId]),
      db.query(`SELECT sa.*, u.name FROM sos_alerts sa JOIN students s ON sa.student_id = s.id
                JOIN users u ON s.user_id = u.id WHERE s.mentor_id = $1 AND sa.resolved = false`, [mentorId]),
    ]);
    res.json({
      highRisk: highRisk.rows,
      tamperedDocuments: tampered.rows,
      missedCheckins: missedCheckins.rows,
      sosAlerts: sos.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Meetings
router.get('/meetings', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;
  try {
    const { rows } = await db.query(`
      SELECT m.*, array_agg(ms.student_id) FILTER (WHERE ms.student_id IS NOT NULL) as student_ids
      FROM meetings m
      LEFT JOIN meeting_students ms ON ms.meeting_id = m.id
      WHERE m.mentor_id = $1
      GROUP BY m.id ORDER BY m.date DESC
    `, [mentorId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/meetings', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;
  const { title, date, time, meetingUrl, actionItems, studentIds } = req.body;
  try {
    const meetRes = await db.query(
      `INSERT INTO meetings (title, date, time, mentor_id, meeting_url, action_items) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title, date, time, mentorId, meetingUrl, actionItems]
    );
    const meetingId = meetRes.rows[0].id;
    if (studentIds?.length) {
      for (const sid of studentIds) {
        await db.query('INSERT INTO meeting_students (meeting_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [meetingId, sid]);
      }
    }
    res.status(201).json(meetRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resources
router.get('/resources', mentorAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT r.*, u.name as uploaded_by_name FROM resources r
      JOIN users u ON r.uploaded_by = u.id ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/resources', mentorAuth, async (req, res) => {
  const { title, description, type, url } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO resources (title, description, type, url, uploaded_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title, description, type || 'link', url, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Forum
router.get('/forum', mentorAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT ft.*, u.name as author_name,
        json_agg(json_build_object('id',fr.id,'content',fr.content,'author',ru.name,'date',fr.created_at)
          ORDER BY fr.created_at) FILTER (WHERE fr.id IS NOT NULL) as replies
      FROM forum_threads ft
      JOIN users u ON ft.author_id = u.id
      LEFT JOIN forum_replies fr ON fr.thread_id = ft.id
      LEFT JOIN users ru ON fr.author_id = ru.id
      GROUP BY ft.id, u.name ORDER BY ft.pinned DESC, ft.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/forum', mentorAuth, async (req, res) => {
  const { title, content, pinned } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO forum_threads (title, content, author_id, pinned) VALUES ($1,$2,$3,$4) RETURNING *`,
      [title, content, req.user.id, pinned || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/forum/:id/reply', mentorAuth, async (req, res) => {
  const { content } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO forum_replies (thread_id, author_id, content) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user.id, content]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Analytics (same as admin but filtered to mentor's mentees)
router.get('/analytics', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;
  try {
    const [riskDist, cgpaTrend, attendanceDist] = await Promise.all([
      db.query(`SELECT risk_level as name, COUNT(*) as value FROM students WHERE mentor_id = $1 GROUP BY risk_level`, [mentorId]),
      db.query(`SELECT semester, AVG(cgpa) as cgpa FROM students WHERE mentor_id = $1 GROUP BY semester ORDER BY semester`, [mentorId]),
      db.query(`
        SELECT CASE
          WHEN attendance >= 90 THEN '90-100%' WHEN attendance >= 80 THEN '80-89%'
          WHEN attendance >= 70 THEN '70-79%' WHEN attendance >= 60 THEN '60-69%' ELSE '<60%'
        END as range, COUNT(*) as count
        FROM students WHERE mentor_id = $1 GROUP BY 1 ORDER BY 1
      `, [mentorId]),
    ]);
    res.json({ riskDistribution: riskDist.rows, cgpaTrends: cgpaTrend.rows, attendanceDistribution: attendanceDist.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave management
router.put('/leaves/:id', mentorAuth, async (req, res) => {
  const { status } = req.body;
  const mentorId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `UPDATE leave_records SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *`,
      [status, mentorId, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Goals management
router.post('/mentees/:id/goals', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;
  const { title, description, deadline, mentorNote, tasks } = req.body;
  try {
    const goalRes = await db.query(
      `INSERT INTO goals (student_id, mentor_id, title, description, deadline, mentor_note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, mentorId, title, description, deadline, mentorNote]
    );
    const goalId = goalRes.rows[0].id;
    if (tasks?.length) {
      for (const t of tasks) {
        await db.query(`INSERT INTO goal_tasks (goal_id, title) VALUES ($1,$2)`, [goalId, t.title]);
      }
    }
    res.status(201).json(goalRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Concerns (read only for mentor)
router.get('/concerns', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;
  try {
    const { rows } = await db.query(`
      SELECT c.*, CASE WHEN c.anonymous THEN 'Anonymous' ELSE u.name END as student_name
      FROM concerns c JOIN students s ON c.student_id = s.id JOIN users u ON s.user_id = u.id
      WHERE s.mentor_id = $1 ORDER BY c.created_at DESC
    `, [mentorId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;