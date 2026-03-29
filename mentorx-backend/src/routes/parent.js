const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

const parentAuth = auth(['parent', 'admin']);

// Helper: get student_id for this parent
async function getStudentId(parentId) {
  const { rows } = await db.query(`SELECT student_id FROM parents WHERE id = $1`, [parentId]);
  return rows[0]?.student_id || null;
}

// ── DASHBOARD ─────────────────────────────────────────────
router.get('/dashboard', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  try {
    const studentId = await getStudentId(parentId);
    if (!studentId) return res.json({ student: null, studentName: '—', riskLevel: 'Safe', pendingLeaves: 0, completedCheckIns: 0, recentAlerts: [] });

    const [studentRes, leavesRes, checkInsRes] = await Promise.all([
      db.query(`SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`, [studentId]),
      db.query(`SELECT COUNT(*) FROM leave_records WHERE student_id = $1 AND status = 'Pending'`, [studentId]),
      db.query(`SELECT COUNT(*) FROM check_ins WHERE student_id = $1`, [studentId]),
    ]);

    const student = studentRes.rows[0];
    const recentAlerts = [];
    if (student?.risk_level === 'High') recentAlerts.push({ type: 'danger', message: `${student.name} is at High risk` });
    if (student?.attendance < 75) recentAlerts.push({ type: 'warning', message: `Attendance is ${student.attendance}% (below 75%)` });

    res.json({
      student,
      studentName: student?.name || '—',
      riskLevel: student?.risk_level || 'Safe',
      pendingLeaves: parseInt(leavesRes.rows[0].count),
      completedCheckIns: parseInt(checkInsRes.rows[0].count),
      recentAlerts,
    });
  } catch (err) {
    console.error('GET /parent/dashboard:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CHILDREN ──────────────────────────────────────────────
router.get('/children', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.name, u.email
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN parents p ON p.student_id = s.id
       WHERE p.id = $1`,
      [parentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── CHILD PROFILE ─────────────────────────────────────────
router.get('/children/:id', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  const childId = Number(req.params.id);
  try {
    // Verify parent owns this child
    const check = await db.query(`SELECT id FROM parents WHERE id = $1 AND student_id = $2`, [parentId, childId]);
    if (!check.rows.length) return res.status(403).json({ error: 'Access denied' });

    const [studentRes, checkIns, leaveRecords, documents, skillEntries, healthInfo] = await Promise.all([
      db.query(`SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`, [childId]),
      db.query(`SELECT * FROM check_ins WHERE student_id = $1 ORDER BY submitted_at DESC LIMIT 14`, [childId]),
      db.query(`SELECT * FROM leave_records WHERE student_id = $1 ORDER BY created_at DESC`, [childId]),
      db.query(`SELECT * FROM documents WHERE student_id = $1 ORDER BY uploaded_at DESC`, [childId]),
      db.query(`SELECT * FROM skill_entries WHERE student_id = $1 ORDER BY entry_date DESC`, [childId]),
      db.query(`SELECT * FROM health_info WHERE student_id = $1`, [childId]),
    ]);

    res.json({
      student: studentRes.rows[0],
      checkIns: checkIns.rows,
      leaveRecords: leaveRecords.rows,
      documents: documents.rows,
      skillEntries: skillEntries.rows,
      healthInfo: healthInfo.rows[0] || null,
      mentorFeedback: [],
    });
  } catch (err) {
    console.error('GET /parent/children/:id:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── NOTIFICATIONS / ALERTS ────────────────────────────────
router.get('/notifications', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  try {
    const studentId = await getStudentId(parentId);
    if (!studentId) return res.json({ highRisk: [], lowAttendance: [], missedCheckins: [], sosAlerts: [] });

    const [student, missedCheckins, sosAlerts] = await Promise.all([
      db.query(`SELECT s.*, u.name FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`, [studentId]),
      db.query(
        `SELECT s.*, u.name FROM students s JOIN users u ON s.user_id = u.id
         WHERE s.id = $1 AND (s.last_check_in IS NULL OR s.last_check_in < CURRENT_DATE - INTERVAL '2 days')`,
        [studentId]
      ),
      db.query(`SELECT sa.*, u.name FROM sos_alerts sa JOIN students s ON s.id = sa.student_id JOIN users u ON u.id = s.user_id WHERE sa.student_id = $1 AND sa.resolved = FALSE`, [studentId]),
    ]);

    const s = student.rows[0];
    res.json({
      highRisk: s?.risk_level === 'High' ? [s] : [],
      lowAttendance: s?.attendance < 75 ? [s] : [],
      missedCheckins: missedCheckins.rows,
      sosAlerts: sosAlerts.rows,
    });
  } catch (err) {
    console.error('GET /parent/notifications:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── MEETINGS ──────────────────────────────────────────────
router.get('/meetings', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  try {
    const studentId = await getStudentId(parentId);
    if (!studentId) return res.json([]);

    const { rows } = await db.query(
      `SELECT m.*, u.name AS mentor_name
       FROM meetings m
       JOIN mentors mt ON mt.id = m.mentor_id
       JOIN users u ON u.id = mt.user_id
       JOIN meeting_students ms ON ms.meeting_id = m.id
       WHERE ms.student_id = $1
       ORDER BY m.date DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── RESOURCES ─────────────────────────────────────────────
router.get('/resources', parentAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.name AS uploaded_by_name FROM resources r JOIN users u ON u.id = r.uploaded_by ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ANNOUNCEMENTS ─────────────────────────────────────────
router.get('/announcements', parentAuth, async (req, res) => {
  try {
    const threads = await db.query(
      `SELECT ft.*, u.name AS author_name
       FROM forum_threads ft JOIN users u ON u.id = ft.author_id
       WHERE ft.pinned = TRUE
       ORDER BY ft.created_at DESC`
    );

    const withReplies = await Promise.all(
      threads.rows.map(async (t) => {
        const replies = await db.query(
          `SELECT fr.*, u.name AS author FROM forum_replies fr JOIN users u ON u.id = fr.author_id WHERE fr.thread_id = $1 ORDER BY fr.created_at ASC`,
          [t.id]
        );
        return { ...t, replies: replies.rows.map(r => ({ ...r, date: r.created_at })) };
      })
    );
    res.json(withReplies);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ANALYTICS ─────────────────────────────────────────────
router.get('/analytics', parentAuth, async (req, res) => {
  const parentId = req.user.roleId;
  try {
    const studentId = await getStudentId(parentId);

    const [riskDist, cgpaTrends, attendanceDist, checkInFreq] = await Promise.all([
      db.query(`SELECT risk_level AS name, COUNT(*) AS value FROM students GROUP BY risk_level`),
      db.query(`SELECT semester, ROUND(AVG(cgpa)::numeric,2) AS cgpa FROM students GROUP BY semester ORDER BY semester`),
      db.query(`
        SELECT
          CASE WHEN attendance >= 90 THEN '90-100%' WHEN attendance >= 80 THEN '80-89%'
               WHEN attendance >= 70 THEN '70-79%' WHEN attendance >= 60 THEN '60-69%' ELSE '<60%'
          END AS range, COUNT(*) AS count FROM students GROUP BY range`),
      studentId
        ? db.query(
            `SELECT TO_CHAR(submitted_at, 'Mon') AS month, COUNT(*) AS count
             FROM check_ins WHERE student_id = $1
             GROUP BY month ORDER BY MIN(submitted_at)`,
            [studentId]
          )
        : { rows: [] },
    ]);

    res.json({
      riskDistribution: riskDist.rows.map(r => ({ name: r.name, value: parseInt(r.value) })),
      cgpaTrends: cgpaTrends.rows.map(r => ({ semester: `Sem ${r.semester}`, cgpa: parseFloat(r.cgpa) })),
      attendanceDistribution: attendanceDist.rows.map(r => ({ range: r.range, count: parseInt(r.count) })),
      checkInFrequency: checkInFreq.rows.map(r => ({ month: r.month, count: parseInt(r.count) })),
    });
  } catch (err) {
    console.error('GET /parent/analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;