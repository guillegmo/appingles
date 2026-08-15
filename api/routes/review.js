// routes/review.js
// Smart Review: tarjetas de repaso (repetición espaciada).
// - Los intentos fallidos crean tarjetas (reviewCards).
// - GET /review/due -> tarjetas que toca revisar hoy.
// - POST /review/:id/result -> { quality: 0|3|4|5 } reprograma la tarjeta.
// - GET /review/smart -> (compat) tarjetas de los días donde falló.

const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const reviewService = require('../services/reviewService');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /review/smart — tarjetas de los días donde falló (compat con V2).
router.get('/smart', async (req, res) => {
  const attempts = (await store.listDocs('exerciseAttempts'))
    .filter((a) => a.userId === req.user.id && a.correct === false)
    .slice(-50);

  const seen = new Set();
  const items = [];
  for (const a of attempts) {
    const key = `day-${a.day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const card = await reviewService.ensureCard(req.user.id, a.day);
    if (card) items.push(card);
  }

  res.json({ items, total: items.length });
});

// GET /review/due — tarjetas que toca revisar hoy (SRS).
router.get('/due', async (req, res) => {
  const items = await reviewService.dueCards(req.user.id, { limit: Number(req.query.limit) || 20 });
  res.json({ items, total: items.length });
});

// GET /review/count — cuántas tarjetas hay para hoy (para Home/HomePage).
router.get('/count', async (req, res) => {
  const count = await reviewService.countDue(req.user.id);
  res.json({ due: count });
});

// POST /review/:id/result — body: { quality: 0|3|4|5 }
router.post('/:id/result', async (req, res) => {
  const quality = Number(req.body?.quality);
  if (![0, 3, 4, 5].includes(quality)) {
    return res.status(400).json({ error: 'quality debe ser 0, 3, 4 o 5' });
  }
  const result = await reviewService.recordResult(req.user.id, req.params.id, quality);
  if (!result.ok) return res.status(404).json({ error: result.error });
  res.json(result);
});

module.exports = router;
