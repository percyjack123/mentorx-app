/**
 * auth.routes.js  —  MentorX Authentication
 *
 * Flows:
 *   POST /register        → mentee | mentor | parent
 *   POST /verify-email    → 6-digit OTP confirmation
 *   POST /resend-otp      → resend OTP (rate-limited)
 *   POST /login           → role-validated login
 *   GET  /me              → token introspection
 *   POST /forgot-password → reset link (dev: token in response)
 *   POST /reset-password  → consume reset token
 *
 * Registration gates:
 *   mentee  → OTP verify → mentor must accept → login allowed
 *   mentor  → OTP verify → admin must approve → login allowed
 *   parent  → must supply child email (verified mentee) → OTP verify → login allowed
 */

const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const db      = require('../db');

// ─── helpers ──────────────────────────────────────────────────────────────────

async function notify(userId, type, message) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)`,
      [userId, type, message]
    );
  } catch (_) { /* non-fatal */ }
}

/** Generate a 6-digit OTP, store it, return the plain value */
async function issueOtp(client, userId) {
  // Invalidate any existing unused OTPs for this user
  await client.query(
    `UPDATE email_verification_tokens
        SET used = TRUE
      WHERE user_id = $1 AND used = FALSE`,
    [userId]
  );

  const otp       = String(Math.floor(100000 + Math.random() * 900000)); // "123456"
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);          // 24 h

  await client.query(
    `INSERT INTO email_verification_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, otp, expiresAt]
  );

  return otp;
}

/** Send OTP via email.
 *  In production: swap this body for your mail provider (Nodemailer, SendGrid, etc.)
 *  In development:  OTP is returned in the API response instead.
 */
async function sendOtpEmail(email, otp, name) {
  if (process.env.NODE_ENV === 'production') {
    // TODO: integrate mail provider
    // e.g. await mailer.send({ to: email, subject: 'Verify your MentorX account', html: `<p>Your OTP is <b>${otp}</b>. Valid for 24 hours.</p>` });
    console.log(`[MAIL] OTP ${otp} → ${email}`);
  } else {
    // Dev: just log; the route also returns the OTP in the response body
    console.log(`[DEV MAIL] OTP for ${name} <${email}>: ${otp}`);
  }
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const {
    name,
    email,
    password,
    role        = 'mentee',
    department  = null,
    semester,
    mentorEmail = null,   // mentee: optional preferred mentor
    childEmail  = null,   // parent: required
    relationship = null,
  } = req.body || {};

  const normalRole = String(role).toLowerCase();

  if (!name || !email || !password)
    return res.status(400).json({ error: 'name, email and password are required' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  if (!['mentee', 'mentor', 'parent'].includes(normalRole))
    return res.status(400).json({ error: 'role must be mentee, mentor or parent' });

  if (normalRole === 'parent' && !childEmail)
    return res.status(400).json({ error: 'childEmail is required for parent registration' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // ── duplicate email check ──────────────────────────────────────────────
    const existing = await client.query(
      `SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]
    );
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const hash = await bcrypt.hash(password, 12);

    // ════════════════════════════════════════════════════════════════════════
    // MENTOR
    // ════════════════════════════════════════════════════════════════════════
    if (normalRole === 'mentor') {
      const userRes = await client.query(
        `INSERT INTO users (name, email, password_hash, role, "isVerified", "isApproved")
         VALUES ($1, $2, $3, 'mentor', FALSE, FALSE)
         RETURNING id`,
        [name.trim(), email.toLowerCase(), hash]
      );
      const userId = userRes.rows[0].id;

      await client.query(
        `INSERT INTO mentors (user_id, department, status)
         VALUES ($1, $2, 'Pending')`,
        [userId, department]
      );

      const otp = await issueOtp(client, userId);
      await client.query('COMMIT');

      await sendOtpEmail(email, otp, name);

      // Notify all admins
      const admins = await db.query(`SELECT id FROM users WHERE role = 'admin'`);
      for (const a of admins.rows) {
        await notify(a.id, 'mentor_registration',
          `New mentor registration: ${name} (${email}) — pending approval`);
      }

      return res.status(201).json({
        message : 'Mentor registered. Check your email for the OTP to verify your account, then await admin approval.',
        userId,
        ...(process.env.NODE_ENV !== 'production' && { otp, _dev: 'OTP shown in dev only' }),
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // PARENT
    // ════════════════════════════════════════════════════════════════════════
    if (normalRole === 'parent') {
      // Child must exist AND be verified (email confirmed)
      const childRes = await client.query(
        `SELECT u.id AS child_user_id, s.id AS student_id
           FROM users u
           JOIN students s ON s.user_id = u.id
          WHERE u.email = $1
            AND u.role  = 'mentee'
            AND u."isVerified" = TRUE`,
        [childEmail.toLowerCase()]
      );

      if (!childRes.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'No verified mentee account found for that child email. '
               + 'Ask your child to register and verify their account first.',
        });
      }

      const { child_user_id, student_id } = childRes.rows[0];

      // Prevent duplicate parent-child link
      const dupLink = await client.query(
        `SELECT id FROM parents WHERE student_id = $1 AND user_id IN (
           SELECT id FROM users WHERE email = $2
         )`, [student_id, email.toLowerCase()]
      );
      if (dupLink.rows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'This parent account is already linked to that child' });
      }

      const parentUserRes = await client.query(
        `INSERT INTO users (name, email, password_hash, role, "isVerified", "isApproved", "parentLinkedTo")
         VALUES ($1, $2, $3, 'parent', FALSE, FALSE, $4)
         RETURNING id`,
        [name.trim(), email.toLowerCase(), hash, child_user_id]
      );
      const parentUserId = parentUserRes.rows[0].id;

      await client.query(
        `INSERT INTO parents (user_id, student_id, relationship)
         VALUES ($1, $2, $3)`,
        [parentUserId, student_id, relationship || 'Parent']
      );

      const otp = await issueOtp(client, parentUserId);
      await client.query('COMMIT');

      await sendOtpEmail(email, otp, name);

      return res.status(201).json({
        message: 'Parent account created. Check your email for the OTP to verify your account.',
        userId : parentUserId,
        ...(process.env.NODE_ENV !== 'production' && { otp, _dev: 'OTP shown in dev only' }),
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // MENTEE  (default)
    // ════════════════════════════════════════════════════════════════════════
    const userRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, "isVerified", "isApproved")
       VALUES ($1, $2, $3, 'mentee', FALSE, FALSE)
       RETURNING id`,
      [name.trim(), email.toLowerCase(), hash]
    );
    const userId = userRes.rows[0].id;

    const studentRes = await client.query(
      `INSERT INTO students (user_id, department, semester)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, department, semester ? parseInt(semester, 10) : 1]
    );
    const studentId = studentRes.rows[0].id;

    // Optional: send mentor request at registration time
    let mentorRequestStatus = null;
    if (mentorEmail) {
      const mentorRes = await client.query(
        `SELECT u.id AS mentor_user_id, m.id AS mentor_id
           FROM users u
           JOIN mentors m ON m.user_id = u.id
          WHERE u.email = $1
            AND u.role  = 'mentor'
            AND m.status = 'Active'`,
        [mentorEmail.toLowerCase()]
      );

      if (!mentorRes.rows.length) {
        mentorRequestStatus = 'mentor_not_found';
      } else {
        const { mentor_user_id, mentor_id } = mentorRes.rows[0];
        await client.query(
          `INSERT INTO mentor_requests (student_id, mentor_id, status)
           VALUES ($1, $2, 'Pending')
           ON CONFLICT (student_id, mentor_id) DO NOTHING`,
          [studentId, mentor_id]
        );
        await notify(mentor_user_id, 'mentor_request',
          `${name} sent you a mentor connection request`);
        mentorRequestStatus = 'pending';
      }
    } else {
      // Notify admins about unassigned mentee to prevent deadlock
      const admins = await client.query(`SELECT id FROM users WHERE role = 'admin'`);
      for (const a of admins.rows) {
        await notify(a.id, 'unassigned_mentee', `New mentee ${name} registered without a mentor.`);
      }
      mentorRequestStatus = 'none_selected';
    }

    const otp = await issueOtp(client, userId);
    await client.query('COMMIT');

    await sendOtpEmail(email, otp, name);

    return res.status(201).json({
      message: 'Account created. '
             + 'Check your email for the OTP to verify your account. '
             + 'After verification, a mentor must accept your request before you can log in.',
      userId,
      mentorRequestStatus,
      ...(process.env.NODE_ENV !== 'production' && { otp, _dev: 'OTP shown in dev only' }),
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('REGISTER ERROR:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  } finally {
    client.release();
  }
});

// ─── VERIFY EMAIL (OTP) ───────────────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  const { email, otp } = req.body || {};

  if (!email || !otp)
    return res.status(400).json({ error: 'email and otp are required' });

  const otpStr = String(otp).trim();

  try {
    // Look up the user
    const userRes = await db.query(
      `SELECT id, role, "isVerified" FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    if (!userRes.rows.length)
      return res.status(404).json({ error: 'No account found for that email' });

    const user = userRes.rows[0];

    if (user["isVerified"])
      return res.status(400).json({ error: 'Email already verified' });

    // Validate OTP
    const tokenRes = await db.query(
      `SELECT id FROM email_verification_tokens
        WHERE user_id   = $1
          AND token     = $2
          AND used      = FALSE
          AND expires_at > NOW()`,
      [user.id, otpStr]
    );

    if (!tokenRes.rows.length)
      return res.status(400).json({ error: 'Invalid or expired OTP. Request a new one.' });

    // Mark verified + consume token
    await db.query(
      `UPDATE users SET "isVerified" = TRUE WHERE id = $1`, [user.id]
    );
    await db.query(
      `UPDATE email_verification_tokens SET used = TRUE WHERE id = $1`,
      [tokenRes.rows[0].id]
    );

    // Role-specific post-verification message
    let nextStep = 'You can now log in.';
    if (user.role === 'mentee') {
      nextStep = 'Email verified. Your account is now pending mentor approval — you will be notified once a mentor accepts your request.';
    } else if (user.role === 'mentor') {
      nextStep = 'Email verified. Your registration is pending admin approval — you will be notified once approved.';
    }

    return res.json({ message: nextStep, role: user.role });

  } catch (err) {
    console.error('VERIFY EMAIL ERROR:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ─── RESEND OTP ───────────────────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });

  const client = await db.pool.connect();
  try {
    const userRes = await client.query(
      `SELECT id, name, "isVerified" FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    if (!userRes.rows.length)
      return res.status(404).json({ error: 'No account found for that email' });

    const user = userRes.rows[0];
    if (user["isVerified"])
      return res.status(400).json({ error: 'Email is already verified' });

    // Rate-limit: no more than 1 resend per 60 seconds
    const recent = await client.query(
      `SELECT created_at FROM email_verification_tokens
        WHERE user_id = $1 AND used = FALSE
        ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );
    if (recent.rows.length) {
      const ageMs = Date.now() - new Date(recent.rows[0].created_at).getTime();
      if (ageMs < 60 * 1000) {
        await client.query('ROLLBACK');
        return res.status(429).json({
          error: `Please wait ${Math.ceil((60000 - ageMs) / 1000)}s before requesting another OTP`,
        });
      }
    }

    await client.query('BEGIN');
    const otp = await issueOtp(client, user.id);
    await client.query('COMMIT');

    await sendOtpEmail(email, otp, user.name);

    return res.json({
      message: 'A new OTP has been sent to your email.',
      ...(process.env.NODE_ENV !== 'production' && { otp, _dev: 'OTP shown in dev only' }),
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('RESEND OTP ERROR:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  } finally {
    client.release();
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password)
    return res.status(400).json({ error: 'email and password are required' });

  try {
    const result = await db.query(
      `SELECT * FROM users WHERE email = $1`, [email.toLowerCase()]
    );
    if (!result.rows.length)
      return res.status(401).json({ error: 'Invalid email or password' });

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch)
      return res.status(401).json({ error: 'Invalid email or password' });

    // ── Gate 1: email must be verified ────────────────────────────────────
    if (!user["isVerified"]) {
      return res.status(403).json({
        error      : 'Email not verified',
        code       : 'EMAIL_NOT_VERIFIED',
        nextStep   : 'Please enter the OTP sent to your email address.',
        email      : user.email,
      });
    }

    // ── Role-specific gates ───────────────────────────────────────────────
    let roleId = null;

    if (user.role === 'mentor') {
      const m = await db.query(
        `SELECT id, status FROM mentors WHERE user_id = $1`, [user.id]
      );
      if (!m.rows.length)
        return res.status(403).json({ error: 'Mentor profile not found. Contact admin.' });

      const { id: mid, status } = m.rows[0];
      if (status === 'Pending')
        return res.status(403).json({
          error  : 'Mentor registration is pending admin approval',
          code   : 'MENTOR_PENDING_APPROVAL',
        });
      if (status === 'Rejected')
        return res.status(403).json({
          error  : 'Mentor registration was rejected. Contact admin.',
          code   : 'MENTOR_REJECTED',
        });

      roleId = mid;
    }

    else if (user.role === 'mentee') {
      // Gate 2: mentor must have accepted
      if (!user["isApproved"]) {
        return res.status(403).json({
          error    : 'Your account is pending mentor approval',
          code     : 'MENTEE_PENDING_APPROVAL',
          nextStep : 'A mentor must accept your connection request before you can log in.',
        });
      }

      const s = await db.query(
        `SELECT id FROM students WHERE user_id = $1`, [user.id]
      );
      roleId = s.rows[0]?.id ?? null;
    }

    else if (user.role === 'parent') {
      const p = await db.query(
        `SELECT id FROM parents WHERE user_id = $1`, [user.id]
      );
      roleId = p.rows[0]?.id ?? null;
    }

    // admin: roleId stays null — that's intentional

    const token = jwt.sign(
      { id: user.id, role: user.role, roleId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id    : user.id,
        name  : user.name,
        email : user.email,
        role  : user.role,
        roleId,
      },
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ─── ME ───────────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const { rows } = await db.query(
      `SELECT id, name, email, role FROM users WHERE id = $1`, [decoded.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    return res.json({ ...rows[0], roleId: decoded.roleId });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const result = await db.query(
      `SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]
    );
    // Always return the same message to prevent email enumeration
    if (!result.rows.length)
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });

    const userId = result.rows[0].id;
    const token  = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 h

    await db.query(
      `UPDATE password_reset_tokens SET used = TRUE
        WHERE user_id = $1 AND used = FALSE`, [userId]
    );
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );

    return res.json({
      message: 'If that email is registered, a reset link has been sent.',
      ...(process.env.NODE_ENV !== 'production' && {
        resetToken : token,
        _dev       : 'Token shown in dev only',
      }),
    });
  } catch (err) {
    console.error('FORGOT PASSWORD ERROR:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword)
    return res.status(400).json({ error: 'token and newPassword are required' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const result = await db.query(
      `SELECT id, user_id FROM password_reset_tokens
        WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
      [token]
    );
    if (!result.rows.length)
      return res.status(400).json({ error: 'Invalid or expired reset token' });

    const { id: tokenId, user_id: userId } = result.rows[0];
    const hash = await bcrypt.hash(newPassword, 12);

    await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, userId]);
    await db.query(`UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`, [tokenId]);

    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

module.exports = router;