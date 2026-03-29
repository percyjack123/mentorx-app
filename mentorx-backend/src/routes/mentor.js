const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

const mentorAuth = auth(['mentor', 'admin']);

// ─── GET MENTEE PROFILE ───────────────────────────────────
router.get('/mentees/:id', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;

  const student = await db.query(
    `SELECT * FROM students WHERE id=$1 AND mentor_id=$2`,
    [req.params.id, mentorId]
  );

  if (!student.rows.length)
    return res.status(404).json({ error: 'Not found' });

  res.json(student.rows[0]);
});

// ─── GET PENDING MENTOR REQUESTS ─────────────────────────
// Returns all pending requests addressed to the authenticated mentor
router.get('/requests', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;

  try {
    const { rows } = await db.query(
      `SELECT
         mr.id,
         mr.student_id,
         mr.status,
         mr.created_at,
         u.name   AS student_name,
         u.email  AS student_email,
         s.department,
         s.semester,
         s.cgpa,
         s.attendance
       FROM mentor_requests mr
       JOIN students s ON s.id = mr.student_id
       JOIN users   u ON u.id = s.user_id
       WHERE mr.mentor_id = $1
       ORDER BY mr.created_at DESC`,
      [mentorId]
    );

    return res.json(rows);
  } catch (err) {
    console.error('GET /mentor/requests error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── ACCEPT A MENTOR REQUEST ─────────────────────────────
router.put('/requests/:id/accept', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;
  const requestId = Number(req.params.id);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Verify the request belongs to this mentor and is still Pending
    const reqRes = await client.query(
      `SELECT * FROM mentor_requests WHERE id = $1 AND mentor_id = $2`,
      [requestId, mentorId]
    );

    if (reqRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const mentorRequest = reqRes.rows[0];

    if (mentorRequest.status !== 'Pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Request is already ${mentorRequest.status}` });
    }

    // Assign mentor_id on the student row
    await client.query(
      `UPDATE students SET mentor_id = $1 WHERE id = $2`,
      [mentorId, mentorRequest.student_id]
    );

    // Mark this request as Accepted
    await client.query(
      `UPDATE mentor_requests SET status = 'Accepted' WHERE id = $1`,
      [requestId]
    );

    // Reject any other pending requests from this student
    // (a student can only have one mentor)
    await client.query(
      `UPDATE mentor_requests
       SET status = 'Rejected'
       WHERE student_id = $1
         AND id != $2
         AND status = 'Pending'`,
      [mentorRequest.student_id, requestId]
    );

    await client.query('COMMIT');

    return res.json({ message: 'Request accepted', studentId: mentorRequest.student_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /mentor/requests/:id/accept error:', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ─── REJECT A MENTOR REQUEST ─────────────────────────────
router.put('/requests/:id/reject', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;
  const requestId = Number(req.params.id);

  try {
    const reqRes = await db.query(
      `SELECT * FROM mentor_requests WHERE id = $1 AND mentor_id = $2`,
      [requestId, mentorId]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (reqRes.rows[0].status !== 'Pending') {
      return res
        .status(400)
        .json({ error: `Request is already ${reqRes.rows[0].status}` });
    }

    await db.query(
      `UPDATE mentor_requests SET status = 'Rejected' WHERE id = $1`,
      [requestId]
    );

    return res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error('PUT /mentor/requests/:id/reject error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── DASHBOARD ────────────────────────────────────────────
router.get('/dashboard', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;

  try {
    const [mentees, highRisk, pendingLeaves, missedCheckins, pendingRequests] =
      await Promise.all([
        db.query('SELECT COUNT(*) FROM students WHERE mentor_id = $1', [mentorId]),
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
             AND (last_check_in IS NULL OR last_check_in < CURRENT_DATE - INTERVAL '2 days')`,
          [mentorId]
        ),
        db.query(
          `SELECT COUNT(*) FROM mentor_requests
           WHERE mentor_id = $1 AND status = 'Pending'`,
          [mentorId]
        ),
      ]);

    return res.json({
      totalMentees: parseInt(mentees.rows[0].count),
      highRiskStudents: parseInt(highRisk.rows[0].count),
      pendingLeaves: parseInt(pendingLeaves.rows[0].count),
      unsubmittedCheckIns: parseInt(missedCheckins.rows[0].count),
      pendingRequests: parseInt(pendingRequests.rows[0].count),
    });
  } catch (err) {
    console.error('GET /mentor/dashboard error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET ALL MENTEES ──────────────────────────────────────
router.get('/mentees', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;

  try {
    const { rows } = await db.query(
      `SELECT s.*, u.name, u.email
       FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE s.mentor_id = $1
       ORDER BY u.name`,
      [mentorId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /mentor/mentees error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET ALERTS ───────────────────────────────────────────
router.get('/alerts', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;

  try {
    const [highRisk, tamperedDocs, missedCheckins, sosAlerts] = await Promise.all([
      db.query(
        `SELECT s.id, u.name, s.risk_score
         FROM students s JOIN users u ON u.id = s.user_id
         WHERE s.mentor_id = $1 AND s.risk_level = 'High'
         ORDER BY s.risk_score DESC`,
        [mentorId]
      ),
      db.query(
        `SELECT d.*, u.name
         FROM documents d
         JOIN students s ON s.id = d.student_id
         JOIN users u ON u.id = s.user_id
         WHERE s.mentor_id = $1 AND d.status != 'Clean'`,
        [mentorId]
      ),
      db.query(
        `SELECT s.id, u.name, s.last_check_in
         FROM students s JOIN users u ON u.id = s.user_id
         WHERE s.mentor_id = $1
           AND (s.last_check_in IS NULL OR s.last_check_in < CURRENT_DATE - INTERVAL '2 days')
         ORDER BY s.last_check_in ASC NULLS FIRST
         LIMIT 10`,
        [mentorId]
      ),
      db.query(
        `SELECT sa.*, u.name
         FROM sos_alerts sa
         JOIN students s ON s.id = sa.student_id
         JOIN users u ON u.id = s.user_id
         WHERE s.mentor_id = $1 AND sa.resolved = FALSE`,
        [mentorId]
      ),
    ]);

    return res.json({
      highRisk: highRisk.rows,
      tamperedDocuments: tamperedDocs.rows,
      missedCheckins: missedCheckins.rows,
      sosAlerts: sosAlerts.rows,
    });
  } catch (err) {
    console.error('GET /mentor/alerts error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── ANALYTICS ────────────────────────────────────────────
router.get('/analytics', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;

  try {
    const [riskDist, cgpaTrends, attendanceDist] = await Promise.all([
      db.query(
        `SELECT risk_level AS name, COUNT(*) AS value
         FROM students WHERE mentor_id = $1
         GROUP BY risk_level`,
        [mentorId]
      ),
      db.query(
        `SELECT semester, ROUND(AVG(cgpa)::numeric, 2) AS cgpa
         FROM students WHERE mentor_id = $1
         GROUP BY semester ORDER BY semester`,
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
         FROM students WHERE mentor_id = $1
         GROUP BY range`,
        [mentorId]
      ),
    ]);

    return res.json({
      riskDistribution: riskDist.rows.map((r) => ({
        name: r.name,
        value: parseInt(r.value),
      })),
      cgpaTrends: cgpaTrends.rows.map((r) => ({
        semester: `Sem ${r.semester}`,
        cgpa: parseFloat(r.cgpa),
      })),
      attendanceDistribution: attendanceDist.rows.map((r) => ({
        range: r.range,
        count: parseInt(r.count),
      })),
    });
  } catch (err) {
    console.error('GET /mentor/analytics error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── FORUM ────────────────────────────────────────────────
router.get('/forum', mentorAuth, async (req, res) => {
  try {
    const threads = await db.query(
      `SELECT ft.*, u.name AS author_name
       FROM forum_threads ft
       JOIN users u ON u.id = ft.author_id
       ORDER BY ft.pinned DESC, ft.created_at DESC`
    );

    const threadsWithReplies = await Promise.all(
      threads.rows.map(async (t) => {
        const replies = await db.query(
          `SELECT fr.*, u.name AS author
           FROM forum_replies fr
           JOIN users u ON u.id = fr.author_id
           WHERE fr.thread_id = $1
           ORDER BY fr.created_at ASC`,
          [t.id]
        );
        return {
          ...t,
          replies: replies.rows.map((r) => ({
            ...r,
            date: r.created_at,
          })),
        };
      })
    );

    return res.json(threadsWithReplies);
  } catch (err) {
    console.error('GET /mentor/forum error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/forum/:id/reply', mentorAuth, async (req, res) => {
  const userId = req.user.id;
  const threadId = Number(req.params.id);
  const { message } = req.body;

  if (!message?.trim())
    return res.status(400).json({ error: 'Message is required' });

  try {
    const result = await db.query(
      `INSERT INTO forum_replies (thread_id, author_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [threadId, userId, message]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /mentor/forum/:id/reply error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── MEETINGS ─────────────────────────────────────────────
router.get('/meetings', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;

  try {
    const { rows } = await db.query(
      `SELECT * FROM meetings WHERE mentor_id = $1 ORDER BY date DESC, time DESC`,
      [mentorId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /mentor/meetings error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/meetings', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;
  const { title, date, time, meetingUrl, studentIds = [], actionItems = [] } = req.body;

  if (!title || !date || !time)
    return res.status(400).json({ error: 'title, date, and time are required' });

  try {
    const result = await db.query(
      `INSERT INTO meetings (title, date, time, mentor_id, meeting_url, action_items)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, date, time, mentorId, meetingUrl || null, actionItems]
    );

    const meeting = result.rows[0];

    if (studentIds.length > 0) {
      for (const sid of studentIds) {
        await db.query(
          `INSERT INTO meeting_students (meeting_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [meeting.id, sid]
        );
      }
    }

    return res.status(201).json(meeting);
  } catch (err) {
    console.error('POST /mentor/meetings error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── RESOURCES ────────────────────────────────────────────
router.get('/resources', mentorAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.*, u.name AS uploaded_by_name
       FROM resources r
       JOIN users u ON u.id = r.uploaded_by
       ORDER BY r.created_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('GET /mentor/resources error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/resources', mentorAuth, async (req, res) => {
  const userId = req.user.id;
  const { title, description, type = 'link', url } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });

  try {
    const result = await db.query(
      `INSERT INTO resources (title, description, type, url, uploaded_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, description || null, type, url || null, userId]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /mentor/resources error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── LEAVE STATUS ─────────────────────────────────────────
router.put('/leave/:id', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;
  const leaveId = Number(req.params.id);
  const { status } = req.body;

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'status must be Approved or Rejected' });
  }

  try {
    // Ensure the leave belongs to a student of this mentor
    const check = await db.query(
      `SELECT lr.id FROM leave_records lr
       JOIN students s ON s.id = lr.student_id
       WHERE lr.id = $1 AND s.mentor_id = $2`,
      [leaveId, mentorId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Leave record not found' });
    }

    const result = await db.query(
      `UPDATE leave_records
       SET status = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, mentorId, leaveId]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /mentor/leave/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── FULL MENTEE PROFILE ──────────────────────────────────
router.get('/mentees/:id/profile', mentorAuth, async (req, res) => {
  const mentorId = req.user.roleId;
  const studentId = Number(req.params.id);

  try {
    const studentRes = await db.query(
      `SELECT s.*, u.name, u.email
       FROM students s JOIN users u ON u.id = s.user_id
       WHERE s.id = $1 AND s.mentor_id = $2`,
      [studentId, mentorId]
    );

    if (!studentRes.rows.length)
      return res.status(404).json({ error: 'Student not found' });

    const [checkIns, leaveRecords, documents, goals, skillEntries, healthInfo] =
      await Promise.all([
        db.query(
          `SELECT * FROM check_ins WHERE student_id = $1 ORDER BY submitted_at DESC LIMIT 14`,
          [studentId]
        ),
        db.query(
          `SELECT * FROM leave_records WHERE student_id = $1 ORDER BY created_at DESC`,
          [studentId]
        ),
        db.query(
          `SELECT * FROM documents WHERE student_id = $1 ORDER BY uploaded_at DESC`,
          [studentId]
        ),
        db.query(
          `SELECT g.*, json_agg(
             json_build_object('id', gt.id, 'title', gt.title, 'completed', gt.completed)
             ORDER BY gt.id
           ) FILTER (WHERE gt.id IS NOT NULL) AS tasks
           FROM goals g
           LEFT JOIN goal_tasks gt ON gt.goal_id = g.id
           WHERE g.student_id = $1
           GROUP BY g.id
           ORDER BY g.created_at DESC`,
          [studentId]
        ),
        db.query(
          `SELECT * FROM skill_entries WHERE student_id = $1 ORDER BY entry_date DESC`,
          [studentId]
        ),
        db.query(
          `SELECT * FROM health_info WHERE student_id = $1`,
          [studentId]
        ),
      ]);

    return res.json({
      student: studentRes.rows[0],
      checkIns: checkIns.rows,
      leaveRecords: leaveRecords.rows,
      documents: documents.rows,
      goals: goals.rows,
      skillEntries: skillEntries.rows,
      healthInfo: healthInfo.rows[0] || null,
    });
  } catch (err) {
    console.error('GET /mentor/mentees/:id/profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;