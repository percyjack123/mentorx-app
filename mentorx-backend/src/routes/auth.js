const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');

// ── LOGIN ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (!result.rows.length) return res.status(401).json({ error: 'User not found' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    let roleId = null;
    if (user.role === 'mentor') {
      const m = await db.query('SELECT id FROM mentors WHERE user_id = $1', [user.id]);
      roleId = m.rows[0]?.id;
    } else if (user.role === 'mentee') {
      const s = await db.query('SELECT id FROM students WHERE user_id = $1', [user.id]);
      roleId = s.rows[0]?.id;
    } else if (user.role === 'parent') {
      const p = await db.query('SELECT id FROM parents WHERE user_id = $1', [user.id]);
      roleId = p.rows[0]?.id;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, roleId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, roleId },
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── REGISTER (mentee self-registration) ──────────────────
router.post('/register', async (req, res) => {
  const body = req.body || {};
  const name        = body.name        || body.fullName   || body.username;
  const email       = body.email       || body.user_email || body.emailAddress;
  const password    = body.password    || body.pass       || body.passwordHash;
  const mentorEmail = body.mentorEmail || body.mentor_email || body.mentor;
  const parentEmail = body.parentEmail || body.parent_email || null;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Check for duplicate email
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const hash = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'mentee') RETURNING id`,
      [name, email, hash]
    );
    const userId = userRes.rows[0].id;

    // Create student record
    const studentRes = await client.query(
      `INSERT INTO students (user_id) VALUES ($1) RETURNING id`,
      [userId]
    );
    const studentId = studentRes.rows[0].id;

    // ── MENTOR REQUEST ────────────────────────────────────
    let requestStatus = null;
    if (mentorEmail) {
      const mentorRes = await client.query(
        `SELECT u.id, m.id AS mentor_id
         FROM users u
         JOIN mentors m ON m.user_id = u.id
         WHERE u.email = $1 AND u.role = 'mentor'`,
        [mentorEmail]
      );
      if (!mentorRes.rows.length) {
        requestStatus = 'mentor_not_found';
      } else {
        await client.query(
          `INSERT INTO mentor_requests (student_id, mentor_id, status)
           VALUES ($1,$2,'Pending')
           ON CONFLICT (student_id, mentor_id) DO NOTHING`,
          [studentId, mentorRes.rows[0].mentor_id]
        );
        requestStatus = 'pending';
      }
    }

    // ── PARENT LINKING ────────────────────────────────────
    // If parentEmail is provided, find the parent record and link this
    // new student to them by inserting a row into the parents table.
    // The parents table stores the relationship: parent → student.
    // Failure to find the parent is silent — it does not block registration.
    let parentLinkStatus = null;
    if (parentEmail) {
      const parentRes = await client.query(
        `SELECT p.user_id, p.relationship
         FROM parents p
         JOIN users u ON u.id = p.user_id
         WHERE u.email = $1 AND u.role = 'parent'
         LIMIT 1`,
        [parentEmail]
      );

      if (parentRes.rows.length) {
        const { user_id: parentUserId, relationship } = parentRes.rows[0];

        // Plain VALUES insert — no subquery, no parameter scoping issues.
        await client.query(
          `INSERT INTO parents (user_id, student_id, relationship)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [parentUserId, studentId, relationship]
        );

        parentLinkStatus = 'linked';
      }
      // If parent not found: do nothing, no error
    }

    await client.query('COMMIT');

    const token = jwt.sign(
      { id: userId, role: 'mentee', roleId: studentId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: { id: userId, name, email, role: 'mentee', roleId: studentId },
      mentorRequestStatus: requestStatus,
      parentLinkStatus,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('REGISTER ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ── ME ────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const { rows } = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ ...rows[0], roleId: decoded.roleId });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ── FORGOT PASSWORD ───────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!result.rows.length) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const userId = result.rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.query(`UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`, [userId]);
    await db.query(`INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)`, [userId, token, expiresAt]);

    const isDev = process.env.NODE_ENV !== 'production';
    return res.json({
      message: 'If that email exists, a reset link has been sent.',
      ...(isDev && { resetToken: token }),
    });
  } catch (err) {
    console.error('FORGOT PASSWORD ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── RESET PASSWORD ────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword are required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const result = await db.query(
      `SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
      [token]
    );
    if (!result.rows.length) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const { id: tokenId, user_id: userId } = result.rows[0];
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
    await db.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenId]);
    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;