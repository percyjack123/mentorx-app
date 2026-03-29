require('dotenv').config();
const express = require('express');
const cors = require('cors');

const fetch = global.fetch || require('node-fetch');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const mentorRoutes = require('./routes/mentor');
const menteeRoutes = require('./routes/mentee');
const parentRoutes = require('./routes/parent');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/mentee', menteeRoutes);
app.use('/api/parent', parentRoutes);

// ── ML route ───────────────────────────────────────────────
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/ml/predict
 * Body: { cgpa, attendance, mood_score, backlog_count, placement_status }
 * Returns: { risk, risk_probability, predicted_cgpa, suggestion }
 */
app.post('/api/ml/predict', async (req, res) => {
  try {
    const {
      cgpa,
      attendance,
      mood_score,
      backlog_count,
      placement_status = 'Not Started',
    } = req.body;

    // Basic validation
    if (
      cgpa === undefined ||
      attendance === undefined ||
      mood_score === undefined ||
      backlog_count === undefined
    ) {
      return res.status(400).json({
        error: 'Missing required fields: cgpa, attendance, mood_score, backlog_count',
      });
    }

    const mlRes = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cgpa: Number(cgpa),
        attendance: Number(attendance),
        mood_score: Number(mood_score),
        backlog_count: Number(backlog_count),
        placement_status: String(placement_status),
      }),
    });

    if (!mlRes.ok) {
      const errText = await mlRes.text().catch(() => 'Unknown error');
      console.error('ML service error:', mlRes.status, errText);
      return res.status(502).json({ error: 'ML service returned an error', detail: errText });
    }

    /** @type {{ risk: string, risk_probability: number, predicted_cgpa: number, suggestion: string }} */
    const data = await mlRes.json();

    return res.json({
      risk: data.risk,
      risk_probability: data.risk_probability,
      predicted_cgpa: data.predicted_cgpa,
      suggestion: data.suggestion,
    });

  } catch (err) {
    console.error('ML API error:', err);
    return res.status(503).json({ error: 'ML service unreachable', detail: err.message });
  }
});

// ── Health ─────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});

module.exports = app;