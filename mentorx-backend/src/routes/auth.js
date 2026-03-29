const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

// 🔐 LOGIN
router.post('/login', async (req, res) => {
  console.log("🔥 LOGIN HIT");

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

    // roleId logic
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
      {
        id: user.id,
        role: user.role,
        roleId
      },
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
        roleId
      }
    });

  } catch (err) {
    console.error("❌ LOGIN ERROR:", err);
    return res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;