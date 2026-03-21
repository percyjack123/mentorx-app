const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Get role-specific id
    let roleId = null;
    if (user.role === 'mentor') {
      const m = await db.query('SELECT id FROM mentors WHERE user_id = $1', [user.id]);
      roleId = m.rows[0]?.id;
    } else if (user.role === 'mentee') {
      const s = await db.query('SELECT id FROM students WHERE user_id = $1', [user.id]);
      roleId = s.rows[0]?.id;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, email: user.email, roleId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, roleId }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', auth(), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;