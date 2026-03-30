const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

const parentAuth = auth(['parent', 'admin']);

async function getStudentIds(parentId) {
  const { rows } = await db.query(
    `SELECT student_id FROM parents WHERE id = $1 AND student_id IS NOT NULL`,
    [parentId]
  );
  return rows.map(r => r.student_id);
}

// ── DASHBOARD ─────────────────────────────────────────────
router.get('/dashboard', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  const empty = {
    totalChildren: 0, avgCgpa: 0, avgAttendance: 0,
    studentName: '—', riskLevel: 'Safe',
    pendingLeaves: 0, completedCheckIns: 0,
    recentAlerts: [], student: null,
  };
  try {
    const studentIds = await getStudentIds(parentId);
    if (!studentIds.length) return res.json(empty);

    const [studentsRes, leavesRes, checkInsRes] = await Promise.all([
      db.query(
        `SELECT s.*, u.name, u.email
         FROM students s JOIN users u ON u.id = s.user_id
         WHERE s.id = ANY($1::int[]) ORDER BY u.name ASC`,
        [studentIds]
      ),
      db.query(
        `SELECT COUNT(*) FROM leave_records
         WHERE student_id = ANY($1::int[]) AND status = 'Pending'`,
        [studentIds]
      ),
      db.query(
        `SELECT COUNT(*) FROM check_ins WHERE student_id = ANY($1::int[])`,
        [studentIds]
      ),
    ]);

    const students = studentsRes.rows;
    const first = students[0];
    const totalChildren = students.length;
    const avgCgpa = students.length
      ? parseFloat((students.reduce((s, x) => s + parseFloat(x.cgpa || 0), 0) / students.length).toFixed(2))
      : 0;
    const avgAttendance = students.length
      ? Math.round(students.reduce((s, x) => s + parseInt(x.attendance || 0), 0) / students.length)
      : 0;

    const recentAlerts = [];
    if (first?.risk_level === 'High') recentAlerts.push({ type: 'danger', message: `${first.name} is at High risk` });
    if (first?.attendance < 75) recentAlerts.push({ type: 'warning', message: `Attendance is ${first.attendance}% (below 75%)` });

    res.json({
      totalChildren, avgCgpa, avgAttendance,
      studentName:       first?.name || '—',
      riskLevel:         first?.risk_level || 'Safe',
      pendingLeaves:     parseInt(leavesRes.rows[0].count),
      completedCheckIns: parseInt(checkInsRes.rows[0].count),
      recentAlerts,
      student:           first || null,
    });
  } catch (err) {
    console.error('GET /parent/dashboard:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── CHILDREN LIST ─────────────────────────────────────────
router.get('/children', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.name, u.email
       FROM students s JOIN users u ON u.id = s.user_id
       JOIN parents p ON p.student_id = s.id
       WHERE p.id = $1 ORDER BY u.name ASC`,
      [parentId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /parent/children:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── CHILD DETAIL ──────────────────────────────────────────
router.get('/children/:id', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  const childId  = Number(req.params.id);
  if (isNaN(childId)) return res.status(400).json({ error: 'Invalid child id' });
  try {
    const ownerCheck = await db.query(
      `SELECT id FROM parents WHERE id = $1 AND student_id = $2`,
      [parentId, childId]
    );
    if (!ownerCheck.rows.length) return res.status(403).json({ error: 'Access denied' });

    const [studentRes, checkInsRes, leaveRes, docsRes, skillsRes, healthRes, feedbackRes] = await Promise.all([
      db.query(
        `SELECT s.*, u.name, u.email FROM students s
         JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
        [childId]
      ),
      db.query(
        `SELECT * FROM check_ins WHERE student_id = $1 ORDER BY submitted_at DESC LIMIT 30`,
        [childId]
      ),
      db.query(`SELECT * FROM leave_records WHERE student_id = $1 ORDER BY created_at DESC`, [childId]),
      db.query(`SELECT * FROM documents WHERE student_id = $1 ORDER BY uploaded_at DESC`, [childId]),
      db.query(`SELECT * FROM skill_entries WHERE student_id = $1 ORDER BY entry_date DESC`, [childId]),
      db.query(`SELECT * FROM health_info WHERE student_id = $1`, [childId]),
      db.query(
        `SELECT fe.comment, fe.rating, mu.name AS mentor_name, fe.created_at AS date
         FROM feedback_entries fe
         JOIN mentors m ON m.id = fe.mentor_id
         JOIN users mu ON mu.id = m.user_id
         WHERE fe.student_id = $1 ORDER BY fe.created_at DESC`,
        [childId]
      ),
    ]);

    if (!studentRes.rows.length) return res.status(404).json({ error: 'Student not found' });

    res.json({
      student:        studentRes.rows[0],
      checkIns:       checkInsRes.rows,
      leaveRecords:   leaveRes.rows,
      documents:      docsRes.rows,
      skillEntries:   skillsRes.rows,
      healthInfo:     healthRes.rows[0] || null,
      mentorFeedback: feedbackRes.rows,
    });
  } catch (err) {
    console.error('GET /parent/children/:id:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── NOTIFICATIONS ─────────────────────────────────────────
router.get('/notifications', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  const empty = { highRisk: [], lowAttendance: [], missedCheckins: [], sosAlerts: [] };
  try {
    const studentIds = await getStudentIds(parentId);
    if (!studentIds.length) return res.json(empty);

    const [highRiskRes, lowAttRes, missedRes, sosRes] = await Promise.all([
      db.query(
        `SELECT s.*, u.name FROM students s JOIN users u ON u.id = s.user_id
         WHERE s.id = ANY($1::int[]) AND s.risk_level = 'High'`,
        [studentIds]
      ),
      db.query(
        `SELECT s.*, u.name FROM students s JOIN users u ON u.id = s.user_id
         WHERE s.id = ANY($1::int[]) AND s.attendance < 75`,
        [studentIds]
      ),
      db.query(
        `SELECT s.*, u.name FROM students s JOIN users u ON u.id = s.user_id
         WHERE s.id = ANY($1::int[])
           AND (s.last_check_in IS NULL OR s.last_check_in < CURRENT_DATE - INTERVAL '2 days')`,
        [studentIds]
      ),
      db.query(
        `SELECT sa.*, u.name FROM sos_alerts sa
         JOIN students s ON s.id = sa.student_id
         JOIN users u ON u.id = s.user_id
         WHERE sa.student_id = ANY($1::int[]) AND sa.resolved = FALSE
         ORDER BY sa.created_at DESC`,
        [studentIds]
      ),
    ]);

    res.json({
      highRisk:       highRiskRes.rows,
      lowAttendance:  lowAttRes.rows,
      missedCheckins: missedRes.rows,
      sosAlerts:      sosRes.rows,
    });
  } catch (err) {
    console.error('GET /parent/notifications:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── MEETINGS ──────────────────────────────────────────────
router.get('/meetings', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  try {
    const studentIds = await getStudentIds(parentId);
    if (!studentIds.length) return res.json([]);
    const { rows } = await db.query(
      `SELECT DISTINCT m.*, u.name AS mentor_name
       FROM meetings m
       JOIN mentors mt ON mt.id = m.mentor_id
       JOIN users u ON u.id = mt.user_id
       JOIN meeting_students ms ON ms.meeting_id = m.id
       WHERE ms.student_id = ANY($1::int[])
       ORDER BY m.date DESC`,
      [studentIds]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /parent/meetings:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── RESOURCES ─────────────────────────────────────────────
router.get('/resources', parentAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.name AS uploaded_by_name
       FROM resources r JOIN users u ON u.id = r.uploaded_by
       ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /parent/resources:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── ANNOUNCEMENTS (pinned forum threads) ──────────────────
router.get('/announcements', parentAuth, async (req, res) => {
  try {
    const threadsRes = await db.query(
      `SELECT ft.*, u.name AS author_name
       FROM forum_threads ft JOIN users u ON u.id = ft.author_id
       WHERE ft.pinned = TRUE ORDER BY ft.created_at DESC`
    );
    const threads = await Promise.all(
      threadsRes.rows.map(async (thread) => {
        const repliesRes = await db.query(
          `SELECT fr.*, u.name AS author
           FROM forum_replies fr JOIN users u ON u.id = fr.author_id
           WHERE fr.thread_id = $1 ORDER BY fr.created_at ASC`,
          [thread.id]
        );
        return { ...thread, replies: repliesRes.rows.map(r => ({ ...r, date: r.created_at })) };
      })
    );
    res.json(threads);
  } catch (err) {
    console.error('GET /parent/announcements:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── ANALYTICS ─────────────────────────────────────────────
router.get('/analytics', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  const empty = { riskDistribution: [], cgpaTrends: [], attendanceDistribution: [], checkInFrequency: [] };
  try {
    const studentIds = await getStudentIds(parentId);
    if (!studentIds.length) return res.json(empty);

    const [riskRes, cgpaRes, attendanceRes, checkInRes] = await Promise.all([
      db.query(
        `SELECT risk_level AS name, COUNT(*) AS value FROM students WHERE id = ANY($1::int[]) GROUP BY risk_level`,
        [studentIds]
      ),
      db.query(
        `SELECT semester, ROUND(AVG(cgpa)::numeric,2) AS cgpa FROM students WHERE id = ANY($1::int[]) GROUP BY semester ORDER BY semester`,
        [studentIds]
      ),
      db.query(
        `SELECT
           CASE
             WHEN attendance >= 90 THEN '90-100%'
             WHEN attendance >= 80 THEN '80-89%'
             WHEN attendance >= 70 THEN '70-79%'
             WHEN attendance >= 60 THEN '60-69%'
             ELSE '<60%'
           END AS range, COUNT(*) AS count
         FROM students WHERE id = ANY($1::int[]) GROUP BY range`,
        [studentIds]
      ),
      db.query(
        `SELECT TO_CHAR(submitted_at, 'Mon') AS month, COUNT(*) AS count
         FROM check_ins WHERE student_id = ANY($1::int[])
         GROUP BY month ORDER BY MIN(submitted_at)`,
        [studentIds]
      ),
    ]);

    res.json({
      riskDistribution: riskRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
      cgpaTrends: cgpaRes.rows.map(r => ({ semester: `Sem ${r.semester}`, cgpa: parseFloat(r.cgpa) })),
      attendanceDistribution: attendanceRes.rows.map(r => ({ range: r.range, count: parseInt(r.count) })),
      checkInFrequency: checkInRes.rows.map(r => ({ month: r.month, count: parseInt(r.count) })),
    });
  } catch (err) {
    console.error('GET /parent/analytics:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

module.exports = router;