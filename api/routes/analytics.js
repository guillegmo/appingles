// routes/analytics.js
// Eventos de producto + dashboard de negocio + analytics avanzados (Premium IA).

const express = require('express');
const router = express.Router();
const analytics = require('../services/analytics');
const advancedStats = require('../services/advancedStats');
const entitlement = require('../services/entitlement');
const { authenticate } = require('../middleware/auth');

// POST /analytics/event — body: { event, meta }
router.post('/event', authenticate, async (req, res) => {
  const { event, meta } = req.body || {};
  const result = await analytics.trackEvent({ userId: req.user.id, event, meta });
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.status(201).json({ ok: true });
});

// GET /analytics/advanced — analytics avanzados del usuario (Premium IA).
router.get('/advanced', authenticate, async (req, res) => {
  const ent = entitlement.buildEntitlements(req.subscription);
  if (!ent.canAccessAdvancedStats) {
    return res.status(403).json({ error: 'premium_required', message: 'Los analytics avanzados son parte de Premium IA.' });
  }
  try {
    const days = Number(req.query.days) || 7;
    const stats = await advancedStats.advancedStats(req.user.id, { days });
    analytics.trackEvent({ userId: req.user.id, event: 'stats_viewed', meta: { days } }).catch(() => {});
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'stats_failed', message: err.message });
  }
});

// GET /analytics/dashboard — métricas de negocio.
// Protegido: solo admin (dev: X-Dev-Admin=1).
router.get('/dashboard', authenticate, async (req, res) => {
  const isDev = process.env.AUTH_MODE !== 'firebase';
  const isAdmin = req.user.id === process.env.ADMIN_USER_ID || (isDev && req.header('X-Dev-Admin') === '1');
  if (!isAdmin) return res.status(403).json({ error: 'admin_required' });
  try {
    res.json(await analytics.businessDashboard());
  } catch (err) {
    res.status(500).json({ error: 'dashboard_failed', message: err.message });
  }
});

module.exports = router;
