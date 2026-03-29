const jwt = require('jsonwebtoken');

const auth = (roles = []) => (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ FIX: allow admin without roleId
    if (!decoded || !decoded.role) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    if (decoded.role !== 'admin' && !decoded.roleId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.user = decoded;

    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();

  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = auth;