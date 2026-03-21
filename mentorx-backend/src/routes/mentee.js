const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

const menteeAuth = auth(['mentee', 'admin']);

// GET /api/mentee/dashboard
router.get('/dashboard', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const [student, meetings, mood] = await Promise.all([
      db.query(`SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`, [studentId]),
      db.query(`
        SELECT m.*, array_agg(ms.student_id) as student_ids, u.name as mentor_name
        FROM meetings m
        JOIN meeting_students ms ON ms.meeting_id = m.id
        JOIN mentors me ON m.mentor_id = me.id
        JOIN users u ON me.user_id = u.id
        WHERE ms.student_id = $1 AND m.date >= CURRENT_DATE
        GROUP BY m.id, u.name ORDER BY m.date ASC LIMIT 5
      `, [studentId]),
      db.query(`SELECT mood, submitted_at FROM check_ins WHERE student_id = $1 ORDER BY submitted_at DESC LIMIT 8`, [studentId]),
    ]);
    res.json({ student: student.rows[0], upcomingMeetings: meetings.rows, moodTrend: mood.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/mentee/profile
router.get('/profile', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(`SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`, [studentId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Check-ins
router.post('/checkin', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { mood, update, academicProgress } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO check_ins (student_id, mood, update_text, academic_progress) VALUES ($1,$2,$3,$4) RETURNING *`,
      [studentId, mood, update, academicProgress]
    );
    // Update student mood
    const moodMap = { 5: 'Happy', 4: 'Neutral', 3: 'Stressed', 2: 'Sad', 1: 'Anxious' };
    await db.query('UPDATE students SET mood = $1, last_check_in = CURRENT_DATE WHERE id = $2', [moodMap[mood] || 'Neutral', studentId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/checkin/today', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT * FROM check_ins WHERE student_id = $1 AND DATE(submitted_at) = CURRENT_DATE ORDER BY submitted_at DESC LIMIT 1`,
      [studentId]
    );
    res.json({ submitted: rows.length > 0, checkin: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave
router.get('/leave', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query('SELECT * FROM leave_records WHERE student_id = $1 ORDER BY created_at DESC', [studentId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/leave', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { fromDate, toDate, reason } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO leave_records (student_id, from_date, to_date, reason) VALUES ($1,$2,$3,$4) RETURNING *`,
      [studentId, fromDate, toDate, reason]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Goals
router.get('/goals', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(`
      SELECT g.*, json_agg(json_build_object('id',gt.id,'title',gt.title,'completed',gt.completed) ORDER BY gt.id) as tasks
      FROM goals g LEFT JOIN goal_tasks gt ON gt.goal_id = g.id
      WHERE g.student_id = $1 GROUP BY g.id ORDER BY g.created_at
    `, [studentId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/goals/:goalId/tasks/:taskId', menteeAuth, async (req, res) => {
  const { completed } = req.body;
  try {
    await db.query('UPDATE goal_tasks SET completed = $1 WHERE id = $2', [completed, req.params.taskId]);
    // Recalculate progress
    const { rows } = await db.query(
      `SELECT COUNT(*) as total, SUM(CASE WHEN completed THEN 1 ELSE 0 END) as done
       FROM goal_tasks WHERE goal_id = $1`,
      [req.params.goalId]
    );
    const progress = Math.round((rows[0].done / rows[0].total) * 100);
    const result = await db.query(
      'UPDATE goals SET progress = $1, completed = $2 WHERE id = $3 RETURNING *',
      [progress, progress === 100, req.params.goalId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Skills
router.get('/skills', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query('SELECT * FROM skill_entries WHERE student_id = $1 ORDER BY entry_date DESC', [studentId]);
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
      `INSERT INTO skill_entries (student_id, type, title, description, link, entry_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [studentId, type, title, description, link, entryDate || new Date()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Resources
router.get('/resources', menteeAuth, async (req, res) => {
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

// Concerns
router.post('/concern', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { content, anonymous } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO concerns (student_id, content, anonymous) VALUES ($1,$2,$3) RETURNING *`,
      [studentId, content, anonymous || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Health Info
router.get('/health', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query('SELECT * FROM health_info WHERE student_id = $1', [studentId]);
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/health', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { bloodGroup, chronicConditions, insuranceInfo, emergencyContacts } = req.body;
  try {
    const { rows } = await db.query(`
      INSERT INTO health_info (student_id, blood_group, chronic_conditions, insurance_info, emergency_contacts, updated_at)
      VALUES ($1,$2,$3,$4,$5,NOW())
      ON CONFLICT (student_id) DO UPDATE
      SET blood_group=$2, chronic_conditions=$3, insurance_info=$4, emergency_contacts=$5, updated_at=NOW()
      RETURNING *
    `, [studentId, bloodGroup, chronicConditions, insuranceInfo, JSON.stringify(emergencyContacts)]);
    // Sync key fields back to students table
    await db.query('UPDATE students SET blood_group=$1, chronic_conditions=$2, insurance_info=$3 WHERE id=$4',
      [bloodGroup, chronicConditions, insuranceInfo, studentId]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// SOS
router.post('/sos', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query('INSERT INTO sos_alerts (student_id) VALUES ($1) RETURNING *', [studentId]);
    // Create notification for mentor
    const mentor = await db.query(
      `SELECT m.user_id, u.name as student_name FROM students s JOIN mentors m ON s.mentor_id = m.id JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
      [studentId]
    );
    if (mentor.rows.length) {
      const { user_id, student_name } = mentor.rows[0];
      await db.query(
        `INSERT INTO notifications (user_id, type, message) VALUES ($1,'sos','🚨 SOS alert from ' || $2)`,
        [user_id, student_name]
      );
    }
    res.status(201).json({ message: 'SOS alert sent', alert: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Documents
router.get('/documents', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query('SELECT * FROM documents WHERE student_id = $1 ORDER BY uploaded_at DESC', [studentId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/documents', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { title, description, fileUrl, docType } = req.body;
  // Simple suspicion score simulation
  const suspicionScore = Math.floor(Math.random() * 100);
  const status = suspicionScore < 30 ? 'Clean' : suspicionScore < 70 ? 'Suspicious' : 'Tampered';
  try {
    const { rows } = await db.query(
      `INSERT INTO documents (student_id, title, description, file_url, doc_type, status, suspicion_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [studentId, title, description, fileUrl || '#', docType || 'other', status, suspicionScore]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/documents/:id', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    await db.query('DELETE FROM documents WHERE id = $1 AND student_id = $2', [req.params.id, studentId]);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Feedback
router.post('/feedback', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { rating, comment } = req.body;
  try {
    const mentor = await db.query('SELECT mentor_id FROM students WHERE id = $1', [studentId]);
    if (!mentor.rows[0]?.mentor_id) return res.status(400).json({ error: 'No mentor assigned' });

    const { rows } = await db.query(
      `INSERT INTO feedback_entries (student_id, mentor_id, rating, comment) VALUES ($1,$2,$3,$4) RETURNING *`,
      [studentId, mentor.rows[0].mentor_id, rating, comment]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Notifications
router.get('/notifications', menteeAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/notifications/:id/read', menteeAuth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;