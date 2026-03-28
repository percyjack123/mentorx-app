const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

const parentAuth = auth(['parent', 'admin']);

// GET /api/parent/dashboard
router.get('/dashboard', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  try {
    // Get parent's linked student
    const studentRes = await db.query(
      `SELECT s.*, u.name FROM students s JOIN users u ON s.user_id = u.id
       JOIN parents p ON p.student_id = s.id WHERE p.id = $1`,
      [parentId]
    );
    const student = studentRes.rows[0];
    if (!student) return res.json({ studentName: "—", riskLevel: "Safe", pendingLeaves: 0, completedCheckIns: 0, student: null, recentAlerts: [] });

    const [pendingLeaves, completedCheckIns] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM leave_records WHERE student_id = $1 AND status = 'Pending'`, [student.id]),
      db.query(`SELECT COUNT(*) FROM check_ins WHERE student_id = $1 AND DATE(submitted_at) >= CURRENT_DATE - 30`, [student.id]),
    ]);

    const alerts = [];
    if (student.risk_level === 'High') alerts.push({ type: 'danger', message: `🚨 ${student.name} is at High risk. Please contact the mentor immediately.` });
    if (student.attendance < 75) alerts.push({ type: 'warning', message: `⚠ ${student.name}'s attendance is ${student.attendance}% — below the 75% threshold.` });
    if (!student.last_check_in || new Date(student.last_check_in) < new Date(Date.now() - 3 * 86400000)) {
      alerts.push({ type: 'info', message: `ℹ ${student.name} has not submitted a check-in in the last 3 days.` });
    }

    res.json({
      studentName: student.name,
      riskLevel: student.risk_level,
      pendingLeaves: parseInt(pendingLeaves.rows[0].count),
      completedCheckIns: parseInt(completedCheckIns.rows[0].count),
      student,
      recentAlerts: alerts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/parent/children
router.get('/children', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.name, u.email FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN parents p ON p.student_id = s.id
       WHERE p.id = $1`,
      [parentId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/parent/children/:id
router.get('/children/:id', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  try {
    // Verify this child belongs to this parent
    const parentCheck = await db.query(
      `SELECT p.id FROM parents p WHERE p.id = $1 AND p.student_id = $2`,
      [parentId, req.params.id]
    );
    if (!parentCheck.rows.length) return res.status(403).json({ error: 'Access denied' });

    const student = await db.query(
      `SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
      [req.params.id]
    );
    if (!student.rows.length) return res.status(404).json({ error: 'Student not found' });

    const [checkins, leaves, docs, skills, health] = await Promise.all([
      db.query('SELECT * FROM check_ins WHERE student_id = $1 ORDER BY submitted_at DESC LIMIT 10', [req.params.id]),
      db.query('SELECT * FROM leave_records WHERE student_id = $1 ORDER BY created_at DESC', [req.params.id]),
      db.query('SELECT * FROM documents WHERE student_id = $1 ORDER BY uploaded_at DESC', [req.params.id]),
      db.query('SELECT * FROM skill_entries WHERE student_id = $1 ORDER BY entry_date DESC', [req.params.id]),
      db.query('SELECT * FROM health_info WHERE student_id = $1', [req.params.id]),
    ]);

    res.json({
      student: student.rows[0],
      checkIns: checkins.rows,
      leaveRecords: leaves.rows,
      documents: docs.rows,
      skillEntries: skills.rows,
      healthInfo: health.rows[0] || null,
      mentorFeedback: [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/parent/notifications
router.get('/notifications', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  try {
    const studentRes = await db.query(
      `SELECT s.* FROM students s JOIN parents p ON p.student_id = s.id WHERE p.id = $1`,
      [parentId]
    );
    const students = studentRes.rows;

    const highRisk = students.filter(s => s.risk_level === 'High');
    const lowAttendance = students.filter(s => s.attendance < 75);
    const missedCheckins = students.filter(s => !s.last_check_in || new Date(s.last_check_in) < new Date(Date.now() - 2 * 86400000));

    const sosAlerts = [];
    for (const s of students) {
      const sos = await db.query(
        `SELECT sa.*, u.name FROM sos_alerts sa JOIN students st ON sa.student_id = st.id
         JOIN users u ON st.user_id = u.id WHERE st.id = $1 AND sa.resolved = false`,
        [s.id]
      );
      sosAlerts.push(...sos.rows);
    }

    const studentNames = {};
    for (const s of students) {
      const u = await db.query('SELECT name FROM users WHERE id = $1', [s.user_id]);
      studentNames[s.id] = u.rows[0]?.name || 'Student';
    }

    res.json({
      highRisk: highRisk.map(s => ({ ...s, name: studentNames[s.id] })),
      lowAttendance: lowAttendance.map(s => ({ ...s, name: studentNames[s.id] })),
      missedCheckins: missedCheckins.map(s => ({ ...s, name: studentNames[s.id] })),
      sosAlerts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/parent/meetings
router.get('/meetings', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  try {
    const studentRes = await db.query(
      `SELECT s.id FROM students s JOIN parents p ON p.student_id = s.id WHERE p.id = $1`,
      [parentId]
    );
    const studentIds = studentRes.rows.map(r => r.id);
    if (!studentIds.length) return res.json([]);

    const { rows } = await db.query(
      `SELECT DISTINCT m.* FROM meetings m
       JOIN meeting_students ms ON ms.meeting_id = m.id
       WHERE ms.student_id = ANY($1)
       ORDER BY m.date DESC`,
      [studentIds]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/parent/resources
router.get('/resources', parentAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.name as uploaded_by_name FROM resources r
       JOIN users u ON r.uploaded_by = u.id ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/parent/announcements (pinned forum threads from mentor)
router.get('/announcements', parentAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT ft.*, u.name as author_name,
        json_agg(json_build_object('id',fr.id,'content',fr.content,'author',ru.name,'date',fr.created_at)
          ORDER BY fr.created_at) FILTER (WHERE fr.id IS NOT NULL) as replies
       FROM forum_threads ft
       JOIN users u ON ft.author_id = u.id
       LEFT JOIN forum_replies fr ON fr.thread_id = ft.id
       LEFT JOIN users ru ON fr.author_id = ru.id
       GROUP BY ft.id, u.name ORDER BY ft.pinned DESC, ft.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/parent/analytics
router.get('/analytics', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  try {
    const studentRes = await db.query(
      `SELECT s.* FROM students s JOIN parents p ON p.student_id = s.id WHERE p.id = $1`,
      [parentId]
    );
    const students = studentRes.rows;
    if (!students.length) return res.json({ riskDistribution: [], cgpaTrends: [], attendanceDistribution: [], checkInFrequency: [] });

    const studentIds = students.map(s => s.id);

    const [riskDist, cgpaTrend, attendanceDist, checkInFreq] = await Promise.all([
      db.query(`SELECT risk_level as name, COUNT(*) as value FROM students WHERE id = ANY($1) GROUP BY risk_level`, [studentIds]),
      db.query(`SELECT semester, AVG(cgpa) as cgpa FROM students WHERE id = ANY($1) GROUP BY semester ORDER BY semester`, [studentIds]),
      db.query(`
        SELECT CASE
          WHEN attendance >= 90 THEN '90-100%' WHEN attendance >= 80 THEN '80-89%'
          WHEN attendance >= 70 THEN '70-79%' WHEN attendance >= 60 THEN '60-69%' ELSE '<60%'
        END as range, COUNT(*) as count
        FROM students WHERE id = ANY($1) GROUP BY 1 ORDER BY 1
      `, [studentIds]),
      db.query(`
        SELECT TO_CHAR(submitted_at, 'Mon') as month, COUNT(*) as count
        FROM check_ins WHERE student_id = ANY($1)
        GROUP BY TO_CHAR(submitted_at, 'Mon'), EXTRACT(MONTH FROM submitted_at)
        ORDER BY EXTRACT(MONTH FROM submitted_at)
      `, [studentIds]),
    ]);

    res.json({
      riskDistribution: riskDist.rows,
      cgpaTrends: cgpaTrend.rows,
      attendanceDistribution: attendanceDist.rows,
      checkInFrequency: checkInFreq.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;