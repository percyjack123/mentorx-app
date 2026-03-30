const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../db');
const { extractDataFromImage } = require('../utils/ocr');

const menteeAuth = auth(['mentee']);

async function createNotification(userId, type, message) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)`,
      [userId, type, message]
    );
  } catch (_) {}
}

// ── DASHBOARD ─────────────────────────────────────────────
router.get('/dashboard', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const [studentRes, meetingsRes, moodRes] = await Promise.all([
      db.query(
        `SELECT s.*, u.name, u.email,
                mu.name AS mentor_name, mu.email AS mentor_email
         FROM students s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN mentors m ON m.id = s.mentor_id
         LEFT JOIN users mu ON mu.id = m.user_id
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
    ]);

    const student = studentRes.rows[0];
    if (!student) return res.status(404).json({ error: 'Student not found' });

    res.json({
      student,
      upcomingMeetings: meetingsRes.rows,
      moodTrend: moodRes.rows,
    });
  } catch (err) {
    console.error('GET /mentee/dashboard:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── PROFILE ───────────────────────────────────────────────
router.get('/profile', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.name, u.email,
              mu.name AS mentor_name, mu.email AS mentor_email
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN mentors m ON m.id = s.mentor_id
       LEFT JOIN users mu ON mu.id = m.user_id
       WHERE s.id = $1`,
      [studentId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /mentee/profile:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── CHECK-IN TODAY ────────────────────────────────────────
router.get('/checkin/today', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT * FROM check_ins
       WHERE student_id = $1 AND submitted_at::date = CURRENT_DATE
       ORDER BY submitted_at DESC LIMIT 1`,
      [studentId]
    );
    res.json({ submitted: rows.length > 0, checkin: rows[0] || null });
  } catch (err) {
    console.error('GET /mentee/checkin/today:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── SUBMIT CHECK-IN ───────────────────────────────────────
router.post('/checkin', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { mood, update } = req.body;
  const progress = req.body.progress || req.body.academicProgress || '';
  if (!mood) return res.status(400).json({ error: 'mood is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO check_ins (student_id, mood, update_text, academic_progress)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [studentId, mood, update || '', progress]
    );
    const moodLabel = mood >= 4 ? 'Happy' : mood >= 3 ? 'Neutral' : mood >= 2 ? 'Stressed' : 'Sad';
    await db.query(
      `UPDATE students SET last_check_in = CURRENT_DATE, mood = $1 WHERE id = $2`,
      [moodLabel, studentId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /mentee/checkin:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
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
    console.error('GET /mentee/documents:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

router.post('/documents', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { title, description, fileUrl, docType } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO documents (student_id, title, description, file_url, doc_type, status, suspicion_score)
       VALUES ($1, $2, $3, $4, $5, 'Clean', 0) RETURNING *`,
      [studentId, title, description || null, fileUrl || null, docType || 'other']
    );
    const document = rows[0];

    // Attempt to extract CGPA/Attendance if relevant
    if (fileUrl && (docType === 'grade' || docType === 'attendance')) {
      const { cgpa, attendance } = await extractDataFromImage(fileUrl);
      const updates = [];
      const params = [];
      if (cgpa !== null) {
        updates.push(`cgpa = $${params.length + 1}`);
        params.push(cgpa);
        document.extracted_cgpa = cgpa;
      }
      if (attendance !== null) {
        updates.push(`attendance = $${params.length + 1}`);
        params.push(attendance);
        document.extracted_attendance = attendance;
      }
      if (updates.length > 0) {
        params.push(studentId);
        await db.query(`UPDATE students SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
      }
    }

    res.json(document);
  } catch (err) {
    console.error('POST /mentee/documents:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

router.delete('/documents/:id', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rowCount } = await db.query(
      `DELETE FROM documents WHERE id = $1 AND student_id = $2`,
      [req.params.id, studentId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Document not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /mentee/documents/:id:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── NOTIFICATIONS ─────────────────────────────────────────
router.get('/notifications', menteeAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const { rows } = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /mentee/notifications:', err);
    res.json([]);
  }
});

router.put('/notifications/:id/read', menteeAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    await db.query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
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
    console.error('GET /mentee/leaves:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

router.post('/leaves', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { fromDate, toDate, reason, medicalDocUrl } = req.body;
  if (!fromDate || !toDate || !reason)
    return res.status(400).json({ error: 'fromDate, toDate, and reason are required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO leave_records (student_id, from_date, to_date, reason, medical_doc_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [studentId, fromDate, toDate, reason, medicalDocUrl || null]
    );

    const mentorRes = await db.query(
      `SELECT m.user_id, u.name AS student_name
       FROM students s
       JOIN mentors m ON m.id = s.mentor_id
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [studentId]
    );
    if (mentorRes.rows.length) {
      const { user_id: mentorUserId, student_name } = mentorRes.rows[0];
      await createNotification(mentorUserId, 'leave',
        `${student_name} submitted a leave request (${fromDate} to ${toDate})`);
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('POST /mentee/leaves:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
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
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

router.put('/goals/:goalId/tasks/:taskId', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { goalId, taskId } = req.params;
  const { completed } = req.body;
  try {
    const goalCheck = await db.query(
      `SELECT id FROM goals WHERE id = $1 AND student_id = $2`,
      [goalId, studentId]
    );
    if (!goalCheck.rows.length) return res.status(404).json({ error: 'Goal not found' });

    await db.query(
      `UPDATE goal_tasks SET completed = $1 WHERE id = $2 AND goal_id = $3`,
      [completed, taskId, goalId]
    );

    const tasks = await db.query(`SELECT completed FROM goal_tasks WHERE goal_id = $1`, [goalId]);
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
    res.status(500).json({ error: 'Server error', detail: err.message });
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
    console.error('GET /mentee/resources:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
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
    console.error('GET /mentee/skills:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

router.post('/skills', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { type, title, description, link, entryDate } = req.body;
  if (!type || !title) return res.status(400).json({ error: 'type and title are required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO skill_entries (student_id, type, title, description, link, entry_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [studentId, type, title, description || null, link || null,
       entryDate || new Date().toISOString().split('T')[0]]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /mentee/skills:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── FEEDBACK ──────────────────────────────────────────────
router.post('/feedback', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { rating = 5, comment, message, content } = req.body;
  const finalComment = comment || message || content || '';
  try {
    const studentRes = await db.query(`SELECT mentor_id FROM students WHERE id = $1`, [studentId]);
    const mentorId = studentRes.rows[0]?.mentor_id;
    if (!mentorId) return res.status(400).json({ error: 'No mentor assigned' });

    const { rows } = await db.query(
      `INSERT INTO feedback_entries (student_id, mentor_id, rating, comment)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [studentId, mentorId, rating, finalComment]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /mentee/feedback:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// Fetch previously submitted feedback by the logged-in mentee
router.get('/feedback', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT fe.*,
              mu.name AS mentor_name,
              m.department
       FROM feedback_entries fe
       JOIN mentors m ON m.id = fe.mentor_id
       JOIN users mu ON mu.id = m.user_id
       WHERE fe.student_id = $1
       ORDER BY fe.created_at DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /mentee/feedback:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── FORUM (DISCUSSION) ────────────────────────────────────
router.get('/forum', menteeAuth, async (req, res) => {
  try {
    const threadsRes = await db.query(
      `SELECT ft.*, u.name AS author_name
       FROM forum_threads ft JOIN users u ON u.id = ft.author_id
       ORDER BY ft.pinned DESC, ft.created_at DESC`
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
    console.error('GET /mentee/forum:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

router.post('/forum/:id/reply', menteeAuth, async (req, res) => {
  const threadId = Number(req.params.id);
  const authorId = req.user.id;
  const content = req.body.message || req.body.content;
  if (!content || !content.trim()) return res.status(400).json({ error: 'content is required' });
  try {
    const threadCheck = await db.query(`SELECT id FROM forum_threads WHERE id = $1`, [threadId]);
    if (!threadCheck.rows.length) return res.status(404).json({ error: 'Thread not found' });
    const { rows } = await db.query(
      `INSERT INTO forum_replies (thread_id, author_id, content)
       VALUES ($1,$2,$3)
       RETURNING *, (SELECT name FROM users WHERE id = $2) AS author`,
      [threadId, authorId, content.trim()]
    );
    res.status(201).json({ ...rows[0], date: rows[0].created_at });
  } catch (err) {
    console.error('POST /mentee/forum/:id/reply:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── CONCERN ───────────────────────────────────────────────
router.post('/concern', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { content, anonymous } = req.body;
  if (!content) return res.status(400).json({ error: 'content is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO concerns (student_id, content, anonymous) VALUES ($1,$2,$3) RETURNING id`,
      [studentId, content, anonymous || false]
    );

    if (!anonymous) {
      const mentorRes = await db.query(
        `SELECT m.user_id, u.name AS student_name
         FROM students s
         JOIN mentors m ON m.id = s.mentor_id
         JOIN users u ON u.id = s.user_id
         WHERE s.id = $1`,
        [studentId]
      );
      if (mentorRes.rows.length) {
        const { user_id: mentorUserId, student_name } = mentorRes.rows[0];
        await createNotification(mentorUserId, 'concern', `${student_name} raised a concern`);
      }
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('POST /mentee/concern:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── HEALTH ────────────────────────────────────────────────
router.get('/health', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(`SELECT * FROM health_info WHERE student_id = $1`, [studentId]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error('GET /mentee/health:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
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
         blood_group = EXCLUDED.blood_group,
         chronic_conditions = EXCLUDED.chronic_conditions,
         insurance_info = EXCLUDED.insurance_info,
         emergency_contacts = EXCLUDED.emergency_contacts,
         updated_at = NOW()
       RETURNING *`,
      [studentId, bloodGroup || null, chronicConditions || 'None',
       insuranceInfo || 'None', JSON.stringify(emergencyContacts || [])]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /mentee/health:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
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

    const mentorRes = await db.query(
      `SELECT m.user_id, u.name AS student_name
       FROM students s
       JOIN mentors m ON m.id = s.mentor_id
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [studentId]
    );
    if (mentorRes.rows.length) {
      const { user_id: mentorUserId, student_name } = mentorRes.rows[0];
      await createNotification(mentorUserId, 'sos', `🚨 SOS alert from ${student_name}`);
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('POST /mentee/sos:', err);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

module.exports = router;