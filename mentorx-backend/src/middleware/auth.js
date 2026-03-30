/**
 * auth.middleware.js  —  MentorX JWT + RBAC middleware
 *
 * Every protected route re-validates the user's current status from the DB
 * so stale JWTs cannot be abused after:
 *   - mentor gets rejected by admin
 *   - mentee gets unapproved / removed
 *   - email gets un-verified (manual admin action)
 */

const jwt = require('jsonwebtoken');
const db  = require('../db');

/**
 * auth(roles?)
 *   roles = [] → any authenticated user passes
 *   roles = ['mentor', 'admin'] → only those roles pass
 *
 * Usage:
 *   router.get('/foo', auth(), handler)
 *   router.get('/bar', auth(['admin']), handler)
 *   router.get('/baz', auth.allowRoles('mentor', 'admin'), handler)  // alias
 */
const auth = (roles = []) => async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Unauthorized' });

  const rawToken = header.split(' ')[1];

  try {
    const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);

    // ── 1. Payload sanity ────────────────────────────────────────────────
    if (!decoded?.id || !decoded?.role)
      return res.status(401).json({ error: 'Invalid token payload' });

    // ── 2. roleId is required for every non-admin role ───────────────────
    //    If null, the account profile row is missing (data integrity issue).
    if (decoded.role !== 'admin' && decoded.roleId == null) {
      return res.status(403).json({
        error  : 'Account profile is incomplete. Please contact support.',
        code   : 'PROFILE_INCOMPLETE',
      });
    }

    req.user = decoded;

    // ── 3. Real-time status check (prevents stale-JWT abuse) ─────────────
    //    Admin is exempt — admins are managed directly in DB.
    if (decoded.role !== 'admin') {
      const userRes = await db.query(
        `SELECT u."isVerified",
                u."isApproved",
                m.status AS mentor_status
           FROM users u
           LEFT JOIN mentors m ON m.user_id = u.id AND u.role = 'mentor'
          WHERE u.id = $1`,
        [decoded.id]
      );

      if (!userRes.rows.length)
        return res.status(401).json({ error: 'Unauthorized' });

      const { isVerified, isApproved, mentor_status } = userRes.rows[0];

      if (!isVerified)
        return res.status(403).json({ error: 'Email not verified', code: 'EMAIL_NOT_VERIFIED' });

      if (decoded.role === 'mentor' && mentor_status !== 'Active')
        return res.status(403).json({
          error : mentor_status === 'Pending'
                  ? 'Mentor registration pending admin approval'
                  : 'Mentor registration was rejected',
          code  : mentor_status === 'Pending' ? 'MENTOR_PENDING_APPROVAL' : 'MENTOR_REJECTED',
        });

      if (decoded.role === 'mentee' && !isApproved)
        return res.status(403).json({
          error : 'Account pending mentor approval',
          code  : 'MENTEE_PENDING_APPROVAL',
        });

      // parent: isVerified is sufficient — no extra approval gate
    }

    // ── 4. Role-based access control ─────────────────────────────────────
    if (roles.length && !roles.includes(decoded.role))
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });

    next();

  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Convenience helper: auth.allowRoles('mentor', 'admin')
auth.allowRoles = (...roles) => auth(roles.flat());

module.exports = auth;