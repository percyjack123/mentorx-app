const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');

const mentorAuth = auth(['mentor', 'admin']);

// ── HELPER: resolve mentor DB id ──────────────────────────
// req.user.roleId is the mentors.id for role=mentor,
// but admin has no roleId — admin can pass ?mentor_id= for override.
function getMentorId(req) {
  return req.user.role === 'admin'
    ? (req.query.mentor_id ? Number(req.query.mentor_id) : null)
    : req.user.roleId;
}

// ── DASHBOARD ─────────────────────────────────────────────
// GET /api/mentor/dashboard
// Returns: totalMentees, highRiskStudents, pendingLeaves, unsubmittedCheckIns
router.get('/dashboard', mentorAuth, async (req, res) => {
  const mentorId = getMentorId(req);
  if (!mentorId) return res.status(400).json({ error: 'mentor_id required for admin' });

  try {
    const [
      totalRes,
      highRiskRes,
      pendingLeavesRes,
      unsubmittedRes,
    ] = await Promise.all([
      db.query(
        `SELECT COUNT(*) FROM students WHERE mentor_id = $1`,
        [mentorId]
      ),
      db.query(
        `SELECT COUNT(*) FROM students WHERE mentor_id = $1 AND risk_level = 'High'`,
        [mentorId]
      ),
      db.query(
        `SELECT COUNT(*) FROM leave_records lr
         JOIN students s ON s.id = lr.student_id
         WHERE s.mentor_id = $1 AND lr.status = 'Pending'`,
        [mentorId]
      ),
      db.query(
        `SELECT COUNT(*) FROM students
         WHERE mentor_id = $1
           AND (last_check_in IS NULL OR last_check_in < CURRENT_DATE)`,
        [mentorId]
      ),
    ]);

    res.json({
      totalMentees:        parseInt(totalRes.rows[0].count),
      highRiskStudents:    parseInt(highRiskRes.rows[0].count),
      pendingLeaves:       parseInt(pendingLeavesRes.rows[0].count),
      unsubmittedCheckIns: parseInt(unsubmittedRes.rows[0].count),
    });
  } catch (err) {
    console.error('GET /mentor/dashboard:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── MENTEES LIST ──────────────────────────────────────────
// GET /api/mentor/mentees
// Returns array of students assigned to this mentor
router.get('/mentees', mentorAuth, async (req, res) => {
  const mentorId = getMentorId(req);
  if (!mentorId) return res.status(400).json({ error: 'mentor_id required for admin' });

  try {
    const { rows } = await db.query(
      `SELECT s.*, u.name, u.email
       FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE s.mentor_id = $1
       ORDER BY u.name ASC`,
      [mentorId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /mentor/mentees:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── SINGLE MENTEE FULL PROFILE ────────────────────────────
// GET /api/mentor/mentees/:id
// Returns: student, checkIns, leaveRecords, documents, goals, skillEntries, healthInfo
router.get('/mentees/:id', mentorAuth, async (req, res) => {
  const mentorId = getMentorId(req);
  const studentId = Number(req.params.id);
  if (!mentorId) return res.status(400).json({ error: 'mentor_id required for admin' });

  try {
    // Verify this student belongs to this mentor
    const ownerCheck = await db.query(
      `SELECT id FROM students WHERE id = $1 AND mentor_id = $2`,
      [studentId, mentorId]
    );
    if (!ownerCheck.rows.length) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [
      studentRes,
      checkInsRes,
      leaveRes,
      docsRes,
      goalsRes,
      skillsRes,
      healthRes,
    ] = await Promise.all([
      db.query(
        `SELECT s.*, u.name, u.email
         FROM students s
         JOIN users u ON u.id = s.user_id
         WHERE s.id = $1`,
        [studentId]
      ),
      db.query(
        `SELECT * FROM check_ins
         WHERE student_id = $1
         ORDER BY submitted_at DESC
         LIMIT 30`,
        [studentId]
      ),
      db.query(
        `SELECT * FROM leave_records
         WHERE student_id = $1
         ORDER BY created_at DESC`,
        [studentId]
      ),
      db.query(
        `SELECT * FROM documents
         WHERE student_id = $1
         ORDER BY uploaded_at DESC`,
        [studentId]
      ),
      db.query(
        `SELECT g.*,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', gt.id,
                 'title', gt.title,
                 'completed', gt.completed
               ) ORDER BY gt.id
             ) FILTER (WHERE gt.id IS NOT NULL),
             '[]'
           ) AS tasks
         FROM goals g
         LEFT JOIN goal_tasks gt ON gt.goal_id = g.id
         WHERE g.student_id = $1
         GROUP BY g.id
         ORDER BY g.created_at DESC`,
        [studentId]
      ),
      db.query(
        `SELECT * FROM skill_entries
         WHERE student_id = $1
         ORDER BY entry_date DESC`,
        [studentId]
      ),
      db.query(
        `SELECT * FROM health_info WHERE student_id = $1`,
        [studentId]
      ),
    ]);

    if (!studentRes.rows.length) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      student:      studentRes.rows[0],
      checkIns:     checkInsRes.rows,
      leaveRecords: leaveRes.rows,
      documents:    docsRes.rows,
      goals:        goalsRes.rows,
      skillEntries: skillsRes.rows,
      healthInfo:   healthRes.rows[0] || null,
    });
  } catch (err) {
    console.error('GET /mentor/mentees/:id:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── MENTEE CHECK-INS ──────────────────────────────────────
// GET /api/mentor/mentees/:id/checkins
// Returns paginated check-in history for a specific mentee
router.get('/mentees/:id/checkins', mentorAuth, async (req, res) => {
  const mentorId = getMentorId(req);
  const studentId = Number(req.params.id);
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  if (!mentorId) return res.status(400).json({ error: 'mentor_id required for admin' });

  try {
    const ownerCheck = await db.query(
      `SELECT id FROM students WHERE id = $1 AND mentor_id = $2`,
      [studentId, mentorId]
    );
    if (!ownerCheck.rows.length) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await db.query(
      `SELECT * FROM check_ins
       WHERE student_id = $1
       ORDER BY submitted_at DESC
       LIMIT $2`,
      [studentId, limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /mentor/mentees/:id/checkins:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ALERTS ────────────────────────────────────────────────
// GET /api/mentor/alerts
// Returns: highRisk, tamperedDocuments, missedCheckins, sosAlerts
router.get('/alerts', mentorAuth, async (req, res) => {
  const mentorId = getMentorId(req);
  if (!mentorId) return res.status(400).json({ error: 'mentor_id required for admin' });

  try {
    const [highRiskRes, tamperedRes, missedRes, sosRes] = await Promise.all([
      db.query(
        `SELECT s.*, u.name
         FROM students s
         JOIN users u ON u.id = s.user_id
         WHERE s.mentor_id = $1 AND s.risk_level = 'High'
         ORDER BY s.risk_score DESC`,
        [mentorId]
      ),
      db.query(
        `SELECT d.*, u.name
         FROM documents d
         JOIN students s ON s.id = d.student_id
         JOIN users u ON u.id = s.user_id
         WHERE s.mentor_id = $1
           AND d.status IN ('Suspicious', 'Tampered')
         ORDER BY d.uploaded_at DESC`,
        [mentorId]
      ),
      db.query(
        `SELECT s.*, u.name
         FROM students s
         JOIN users u ON u.id = s.user_id
         WHERE s.mentor_id = $1
           AND (s.last_check_in IS NULL OR s.last_check_in < CURRENT_DATE - INTERVAL '2 days')
         ORDER BY s.last_check_in ASC NULLS FIRST`,
        [mentorId]
      ),
      db.query(
        `SELECT sa.*, u.name
         FROM sos_alerts sa
         JOIN students s ON s.id = sa.student_id
         JOIN users u ON u.id = s.user_id
         WHERE s.mentor_id = $1 AND sa.resolved = FALSE
         ORDER BY sa.created_at DESC`,
        [mentorId]
      ),
    ]);

    res.json({
      highRisk:          highRiskRes.rows,
      tamperedDocuments: tamperedRes.rows,
      missedCheckins:    missedRes.rows,
      sosAlerts:         sosRes.rows,
    });
  } catch (err) {
    console.error('GET /mentor/alerts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── UPDATE LEAVE STATUS ───────────────────────────────────
// PUT /api/mentor/leave/:id
// Body: { status: 'Approved' | 'Rejected' }
router.put('/leave/:id', mentorAuth, async (req, res) => {
  const mentorId = getMentorId(req);
  const leaveId = Number(req.params.id);
  const { status } = req.body;

  if (!mentorId) return res.status(400).json({ error: 'mentor_id required for admin' });
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: "status must be 'Approved' or 'Rejected'" });
  }

  try {
    // Verify leave belongs to one of this mentor's students
    const ownerCheck = await db.query(
      `SELECT lr.id
       FROM leave_records lr
       JOIN students s ON s.id = lr.student_id
       WHERE lr.id = $1 AND s.mentor_id = $2`,
      [leaveId, mentorId]
    );
    if (!ownerCheck.rows.length) {
      return res.status(403).json({ error: 'Access denied or leave not found' });
    }

    const { rows } = await db.query(
      `UPDATE leave_records
       SET status = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, mentorId, leaveId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /mentor/leave/:id:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ANALYTICS ─────────────────────────────────────────────
// GET /api/mentor/analytics
// Returns: riskDistribution, cgpaTrends, attendanceDistribution scoped to mentor's mentees
router.get('/analytics', mentorAuth, async (req, res) => {
  const mentorId = getMentorId(req);
  if (!mentorId) return res.status(400).json({ error: 'mentor_id required for admin' });

  try {
    const [riskRes, cgpaRes, attendanceRes] = await Promise.all([
      db.query(
        `SELECT risk_level AS name, COUNT(*) AS value
         FROM students
         WHERE mentor_id = $1
         GROUP BY risk_level`,
        [mentorId]
      ),
      db.query(
        `SELECT semester, ROUND(AVG(cgpa)::numeric, 2) AS cgpa
         FROM students
         WHERE mentor_id = $1
         GROUP BY semester
         ORDER BY semester`,
        [mentorId]
      ),
      db.query(
        `SELECT
           CASE
             WHEN attendance >= 90 THEN '90-100%'
             WHEN attendance >= 80 THEN '80-89%'
             WHEN attendance >= 70 THEN '70-79%'
             WHEN attendance >= 60 THEN '60-69%'
             ELSE '<60%'
           END AS range,
           COUNT(*) AS count
         FROM students
         WHERE mentor_id = $1
         GROUP BY range`,
        [mentorId]
      ),
    ]);

    res.json({
      riskDistribution: riskRes.rows.map(r => ({
        name: r.name,
        value: parseInt(r.value),
      })),
      cgpaTrends: cgpaRes.rows.map(r => ({
        semester: `Sem ${r.semester}`,
        cgpa: parseFloat(r.cgpa),
      })),
      attendanceDistribution: attendanceRes.rows.map(r => ({
        range: r.range,
        count: parseInt(r.count),
      })),
    });
  } catch (err) {
    console.error('GET /mentor/analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── FORUM THREADS ─────────────────────────────────────────
// GET /api/mentor/forum
router.get('/forum', mentorAuth, async (req, res) => {
  try {
    const threadsRes = await db.query(
      `SELECT ft.*, u.name AS author_name
       FROM forum_threads ft
       JOIN users u ON u.id = ft.author_id
       ORDER BY ft.pinned DESC, ft.created_at DESC`
    );

    const threads = await Promise.all(
      threadsRes.rows.map(async (thread) => {
        const repliesRes = await db.query(
          `SELECT fr.*, u.name AS author
           FROM forum_replies fr
           JOIN users u ON u.id = fr.author_id
           WHERE fr.thread_id = $1
           ORDER BY fr.created_at ASC`,
          [thread.id]
        );
        return {
          ...thread,
          replies: repliesRes.rows.map(r => ({
            ...r,
            date: r.created_at,
          })),
        };
      })
    );

    res.json(threads);
  } catch (err) {
    console.error('GET /mentor/forum:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/mentor/forum/:id/reply
router.post('/forum/:id/reply', mentorAuth, async (req, res) => {
  const threadId = Number(req.params.id);
  const authorId = req.user.id;
  const content = req.body.message || req.body.content;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'content is required' });
  }

  try {
    const threadCheck = await db.query(
      `SELECT id FROM forum_threads WHERE id = $1`,
      [threadId]
    );
    if (!threadCheck.rows.length) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const { rows } = await db.query(
      `INSERT INTO forum_replies (thread_id, author_id, content)
       VALUES ($1, $2, $3)
       RETURNING *, (SELECT name FROM users WHERE id = $2) AS author`,
      [threadId, authorId, content.trim()]
    );
    res.status(201).json({ ...rows[0], date: rows[0].created_at });
  } catch (err) {
    console.error('POST /mentor/forum/:id/reply:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── MEETINGS ──────────────────────────────────────────────
// GET /api/mentor/meetings
router.get('/meetings', mentorAuth, async (req, res) => {
  const mentorId = getMentorId(req);
  if (!mentorId) return res.status(400).json({ error: 'mentor_id required for admin' });

  try {
    const { rows } = await db.query(
      `SELECT m.*,
         ARRAY(
           SELECT ms.student_id FROM meeting_students ms WHERE ms.meeting_id = m.id
         ) AS student_ids
       FROM meetings m
       WHERE m.mentor_id = $1
       ORDER BY m.date DESC, m.time DESC`,
      [mentorId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /mentor/meetings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/mentor/meetings
// Body: { title, date, time, meetingUrl?, studentIds?, actionItems? }
router.post('/meetings', mentorAuth, async (req, res) => {
  const mentorId = getMentorId(req);
  if (!mentorId) return res.status(400).json({ error: 'mentor_id required for admin' });

  const {
    title,
    date,
    time,
    meetingUrl = null,
    studentIds = [],
    actionItems = [],
  } = req.body;

  if (!title || !date || !time) {
    return res.status(400).json({ error: 'title, date and time are required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const meetingRes = await client.query(
      `INSERT INTO meetings (title, date, time, mentor_id, meeting_url, action_items)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, date, time, mentorId, meetingUrl, actionItems]
    );
    const meeting = meetingRes.rows[0];

    // Link students if provided — only students belonging to this mentor
    if (Array.isArray(studentIds) && studentIds.length) {
      const validStudents = await client.query(
        `SELECT id FROM students WHERE id = ANY($1::int[]) AND mentor_id = $2`,
        [studentIds, mentorId]
      );
      for (const { id } of validStudents.rows) {
        await client.query(
          `INSERT INTO meeting_students (meeting_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [meeting.id, id]
        );
      }
      meeting.student_ids = validStudents.rows.map(r => r.id);
    } else {
      meeting.student_ids = [];
    }

    await client.query('COMMIT');
    res.status(201).json(meeting);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /mentor/meetings:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ── RESOURCES ─────────────────────────────────────────────
// GET /api/mentor/resources
router.get('/resources', mentorAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.name AS uploaded_by_name
       FROM resources r
       JOIN users u ON u.id = r.uploaded_by
       ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /mentor/resources:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/mentor/resources
// Body: { title, description?, type, url? }
router.post('/resources', mentorAuth, async (req, res) => {
  const uploadedBy = req.user.id;
  const { title, description = null, type = 'link', url = null } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });
  if (!['link', 'file'].includes(type)) {
    return res.status(400).json({ error: "type must be 'link' or 'file'" });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO resources (title, description, type, url, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *, (SELECT name FROM users WHERE id = $5) AS uploaded_by_name`,
      [title, description, type, url, uploadedBy]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /mentor/resources:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── MENTOR REQUESTS ───────────────────────────────────────
// GET /api/mentor/requests
// Returns: pending mentor requests for this mentor
router.get('/requests', mentorAuth, async (req, res) => {
  const mentorId = getMentorId(req);
  if (!mentorId) return res.status(400).json({ error: 'mentor_id required for admin' });

  try {
    const { rows } = await db.query(
      `SELECT mr.*, u.name AS student_name, u.email AS student_email
       FROM mentor_requests mr
       JOIN students s ON s.id = mr.student_id
       JOIN users u ON u.id = s.user_id
       WHERE mr.mentor_id = $1 AND mr.status = 'Pending'
       ORDER BY mr.created_at ASC`,
      [mentorId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /mentor/requests:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/mentor/requests/:id/accept
// Accept a mentor request and assign student to mentor
router.put('/requests/:id/accept', mentorAuth, async (req, res) => {
  const mentorId = getMentorId(req);
  const requestId = Number(req.params.id);
  if (!mentorId) return res.status(400).json({ error: 'mentor_id required for admin' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Verify request belongs to this mentor
    const requestRes = await client.query(
      `SELECT * FROM mentor_requests WHERE id = $1 AND mentor_id = $2`,
      [requestId, mentorId]
    );
    if (!requestRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const { student_id: studentId } = requestRes.rows[0];

    // Update request status to Accepted
    await client.query(
      `UPDATE mentor_requests SET status = 'Accepted' WHERE id = $1`,
      [requestId]
    );

    // Assign student to mentor
    await client.query(
      `UPDATE students SET mentor_id = $1 WHERE id = $2`,
      [mentorId, studentId]
    );

    // Reject all other pending requests for this student
    await client.query(
      `UPDATE mentor_requests SET status = 'Rejected'
       WHERE student_id = $1 AND mentor_id != $2 AND status = 'Pending'`,
      [studentId, mentorId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Request accepted and student assigned' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /mentor/requests/:id/accept:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/mentor/requests/:id/reject
// Reject a mentor request
router.put('/requests/:id/reject', mentorAuth, async (req, res) => {
  const mentorId = getMentorId(req);
  const requestId = Number(req.params.id);
  if (!mentorId) return res.status(400).json({ error: 'mentor_id required for admin' });

  try {
    const requestRes = await db.query(
      `UPDATE mentor_requests
       SET status = 'Rejected'
       WHERE id = $1 AND mentor_id = $2
       RETURNING *`,
      [requestId, mentorId]
    );
    if (!requestRes.rows.length) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error('PUT /mentor/requests/:id/reject:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;