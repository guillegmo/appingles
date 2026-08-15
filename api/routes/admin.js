// routes/admin.js
// Admin de contenido: generar (IA), listar y publicar lecciones (draft -> published).
// Protegido: admin (dev: X-Dev-Admin=1).

const express = require('express');
const router = express.Router();
const contentGenerator = require('../services/contentGenerator');
const { authenticate } = require('../middleware/auth');

function requireAdmin(req, res, next) {
  const isDev = process.env.AUTH_MODE !== 'firebase';
  const isAdmin = req.user.id === process.env.ADMIN_USER_ID || (isDev && req.header('X-Dev-Admin') === '1');
  if (!isAdmin) return res.status(403).json({ error: 'admin_required' });
  next();
}

router.use(authenticate, requireAdmin);

// POST /admin/content/generate — body: { skill, situation, topic }
router.post('/content/generate', async (req, res) => {
  const { skill, situation, topic } = req.body || {};
  if (!topic) return res.status(400).json({ error: 'topic es requerido' });
  try {
    const result = await contentGenerator.generateLesson({ skill, situation, topic });
    res.status(201).json(result);
  } catch (err) {
    res.status(502).json({ error: 'generation_failed', message: err.message });
  }
});

// GET /admin/content/drafts?status=draft|published
router.get('/content/drafts', async (req, res) => {
  const drafts = await contentGenerator.listDrafts({ status: req.query.status });
  res.json({ items: drafts, total: drafts.length });
});

// POST /admin/content/:id/publish
router.post('/content/:id/publish', async (req, res) => {
  const result = await contentGenerator.publishLesson(req.params.id);
  if (!result.ok) return res.status(result.error === 'draft_not_found' ? 404 : 409).json({ error: result.error });
  res.json(result);
});

module.exports = router;
