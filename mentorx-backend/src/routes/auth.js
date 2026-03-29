const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');

// ─── LOGIN ────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  console.log('🔥 LOGIN HIT');

  try {
    const { email, password } = req.body;

    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleId,
      },
    });
  } catch (err) {
    console.error('❌ LOGIN ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── REGISTER (mentee self-registration) ─────────────────
// Creates a user + student row, optionally sending a mentor request
// Body: { name, email, password, mentorEmail? }
router.post('/register', async (req, res) => {
  const { name, email, password, mentorEmail } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Check email uniqueness
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);

    // Create user
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'mentee') RETURNING id`,
      [name, email, hash]
    );
    const userId = userRes.rows[0].id;

    // Create student row (no mentor_id yet)
    const studentRes = await client.query(
      `INSERT INTO students (user_id) VALUES ($1) RETURNING id`,
      [userId]
    );
    const studentId = studentRes.rows[0].id;

    // Optional: create mentor request if mentorEmail provided
    let requestStatus = null;
    if (mentorEmail) {
      const mentorUserRes = await client.query(
        `SELECT u.id, m.id AS mentor_id
         FROM users u
         JOIN mentors m ON m.user_id = u.id
         WHERE u.email = $1 AND u.role = 'mentor'`,
        [mentorEmail]
      );

      if (mentorUserRes.rows.length === 0) {
        // Don't fail registration — just skip the request
        requestStatus = 'mentor_not_found';
      } else {
        const mentorId = mentorUserRes.rows[0].mentor_id;

        await client.query(
          `INSERT INTO mentor_requests (student_id, mentor_id, status)
           VALUES ($1, $2, 'Pending')
           ON CONFLICT (student_id, mentor_id) DO NOTHING`,
          [studentId, mentorId]
        );
        requestStatus = 'pending';
      }
    }

    await client.query('COMMIT');

    // Issue token immediately so the mentee can log in
    const token = jwt.sign(
      { id: userId, role: 'mentee', roleId: studentId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: { id: userId, name, email, role: 'mentee', roleId: studentId },
      mentorRequestStatus: requestStatus,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ REGISTER ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// ─── FORGOT PASSWORD ──────────────────────────────────────
// Body: { email }
// Returns a reset token (in prod you'd email it; here we return it directly for dev)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);

    // Always respond 200 to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const userId = result.rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate old tokens for this user
    await db.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
      [userId]
    );

    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );

    // In development, return the token directly.
    // In production, send via email and only return the message.
    const isDev = process.env.NODE_ENV !== 'production';
    return res.json({
      message: 'If that email exists, a reset link has been sent.',
      ...(isDev && { resetToken: token }), // Only exposed in dev
    });
  } catch (err) {
    console.error('❌ FORGOT PASSWORD ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── RESET PASSWORD ───────────────────────────────────────
// Body: { token, newPassword }
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'token and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const result = await db.query(
      `SELECT * FROM password_reset_tokens
       WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const { id: tokenId, user_id: userId } = result.rows[0];
    const hash = await bcrypt.hash(newPassword, 10);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
    await db.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenId]);

    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('❌ RESET PASSWORD ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});
// 📝 REGISTER
router.post('/register', async (req, res) => {
  console.log("🔥 REGISTER HIT");

  try {
    const { name, email, password, role, mentorEmail } = req.body;

    // 1️⃣ Validate role
    if (!['mentee', 'parent'].includes(role)) {
      return res.status(403).json({ error: 'Invalid role for signup' });
    }

    // 2️⃣ Check if user exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // 3️⃣ Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 4️⃣ Create user
    const userRes = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, hashed, role]
    );

    const user = userRes.rows[0];

    let roleId = null;

    // 5️⃣ If mentee → create student
    if (role === 'mentee') {
      const studentRes = await pool.query(
        `INSERT INTO students (user_id)
         VALUES ($1)
         RETURNING id`,
        [user.id]
      );

      roleId = studentRes.rows[0].id;

      // 🔥 Handle mentor request
      if (mentorEmail) {
        // find mentor user
        const mentorUser = await pool.query(
          `SELECT id FROM users WHERE email = $1 AND role = 'mentor'`,
          [mentorEmail]
        );

        if (mentorUser.rows.length) {
          const mentor = await pool.query(
            `SELECT id FROM mentors WHERE user_id = $1`,
            [mentorUser.rows[0].id]
          );

          if (mentor.rows.length) {
            await pool.query(
              `INSERT INTO mentor_requests (student_id, mentor_id, status)
               VALUES ($1, $2, 'Pending')`,
              [roleId, mentor.rows[0].id]
            );
          }
        }
      }
    }

    // 6️⃣ Generate token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        roleId
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 7️⃣ Response
    return res.json({
      token,
      user: {
        ...user,
        roleId
      }
    });

  } catch (err) {
    console.error("❌ REGISTER ERROR:", err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;