const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

const menteeAuth = auth(['mentee']);

// ── GET MY DOCUMENTS ──────────────────────────────────────
router.get('/my', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rows } = await db.query(
      `SELECT * FROM documents WHERE student_id = $1 ORDER BY uploaded_at DESC`,
      [studentId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/documents/my:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── UPLOAD DOCUMENT ───────────────────────────────────────
router.post('/upload', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  const { title, description, fileUrl, docType } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO documents (student_id, title, description, file_url, doc_type, status, suspicion_score)
       VALUES ($1, $2, $3, $4, $5, 'Clean', 0) RETURNING *`,
      [studentId, title, description || null, fileUrl || null, docType || 'other']
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/documents/upload:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── DELETE DOCUMENT ───────────────────────────────────────
router.delete('/:id', menteeAuth, async (req, res) => {
  const studentId = req.user.roleId;
  try {
    const { rowCount } = await db.query(
      `DELETE FROM documents WHERE id = $1 AND student_id = $2`,
      [req.params.id, studentId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Document not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /api/documents/:id:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
