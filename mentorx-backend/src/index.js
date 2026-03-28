const fetch = require("node-fetch");
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const mentorRoutes = require('./routes/mentor');
const menteeRoutes = require('./routes/mentee');
const parentRoutes = require('./routes/parent');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (dev)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/mentee', menteeRoutes);
app.use('/api/parent', parentRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ML Risk Prediction proxy
app.post("/predict-risk", async (req, res) => {
  try {
    console.log("➡️ Sending to ML API:", req.body);
    const response = await fetch("https://supriya202q-ml-work-api.hf.space/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const text = await response.text();
    console.log("⬅️ ML Response:", text);
    const data = JSON.parse(text);
    res.json(data);
  } catch (error) {
    console.error("❌ ML API error:", error);
    res.status(500).json({ error: "ML API failed", details: error.message });
  }
});

// 404
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 MentorX backend running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;