// routes/review.js
// Smart Review: tarjetas de repaso (repetición espaciada).
// - Los intentos fallidos crean tarjetas palabra-level (reviewCards).
// - GET /review/due          -> tarjetas que toca revisar hoy (SRS).
// - GET /review/difficult   -> tarjetas con easeFactor bajo o calidad mala.
// - GET /review/pool        -> TODAS las palabras falladas jamás.
// - POST /review/:id/result -> { quality: 0|1|2|3|4|5 } reprograma la tarjeta.

const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const reviewService = require('../services/reviewService');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /review/smart — tarjetas de los días donde falló (compat con V2).
router.get('/smart', async (req, res) => {
const attempts = await store.queryDocs('exerciseAttempts', {
    filters: [
      { field: 'userId', op: '==', value: req.user.id },
      { field: 'correct', op: '==', value: false },
    ],
    orderBy: { field: 'at', direction: 'desc' },
    limit: 50,
  });
  // Las 50 más recientes por fecha (determinista, en vez de slice(-50) sobre un orden arbitrario).

  const seen = new Set();
  const items = [];
  for (const a of attempts) {
    const key = `day-${a.day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cards = await reviewService.ensureCards(req.user.id, a.day);
    for (const c of cards) items.push(c);
  }

  res.json({ items, total: items.length });
});

// GET /review/due — tarjetas que toca revisar hoy (SRS graduado).
router.get('/due', async (req, res) => {
  const items = await reviewService.dueCards(req.user.id, { limit: Number(req.query.limit) || 10 });
  res.json({ items, total: items.length });
});

// GET /review/difficult — tarjetas con easeFactor bajo o calidad mala.
// Úpara el modo "Palabras difíciles" en el frontend.
router.get('/difficult', async (req, res) => {
  const items = await reviewService.getDifficultCards(req.user.id, { limit: Number(req.query.limit) || 15 });
  res.json({ items, total: items.length });
});

// GET /review/pool — TODAS las palabras falladas jamás.
// Free: límite 20. Premium: sin límite (usa el límite que pase el frontend).
router.get('/pool', async (req, res) => {
  const limit = Number(req.query.limit) || 20;
  const items = await reviewService.getPoolCards(req.user.id, { limit });
  res.json({ items, total: items.length });
});

// GET /review/count — número de tarjetas que toca revisar hoy (para el badge en Home)
router.get('/count', async (req, res) => {
  const count = await reviewService.countDue(req.user.id);
  res.json({ count });
});

// POST /review/:id/result — body: { quality: 0|1|2|3|4|5 }
// quality: 0 = fallo completo | 1 = muy difícil | 2 = difícil | 3 = acceptable | 4 = fácil | 5 = dominado
router.post('/:id/result', async (req, res) => {
  const quality = Number(req.body?.quality);
  if (![0, 1, 2, 3, 4, 5].includes(quality)) {
    return res.status(400).json({ error: 'quality debe ser 0, 1, 2, 3, 4 o 5' });
  }
  const result = await reviewService.recordResult(req.user.id, req.params.id, quality);
  if (!result.ok) return res.status(404).json({ error: result.error });
  res.json(result);
});

module.exports = router;
