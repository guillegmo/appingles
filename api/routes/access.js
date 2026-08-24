// routes/access.js
// Acceso al producto AppIngles (autenticación ≠ autorización):
// - GET  /status            → ¿el usuario autenticado tiene acceso? (gate del frontend)
// - POST /activated         → el usuario acaba de crear su contraseña (upsert perfil + analítica)
// - POST /resend-activation → reenvío público del enlace (rate limited, sin enumeración)
// - POST /dev-grant         → SOLO fuera de producción: concede acceso de prueba (E2E/dev)
// - GET  /dev-outbox        → SOLO fuera de producción: lee emails en dry-run (E2E)

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const store = require('../lib/store');
const subscriptionService = require('../services/subscriptionService');
const processor = require('../services/hotmartProcessor');
const provisioning = require('../services/provisioning');
const { authenticate } = require('../middleware/auth');

const isProduction = process.env.NODE_ENV === 'production';

function hasAccess(subscription) {
  return processor.ACCESS_STATUSES.includes(subscriptionService.effectiveStatus(subscription || {}));
}

// Rate limit específico para reenvío: 10 peticiones/hora/IP.
const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.RESEND_MAX_PER_HOUR || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: true, message: 'Si tu compra está confirmada, te llegará un correo en unos minutos.' },
});

// GET /api/access/status
router.get('/status', authenticate, async (req, res) => {
  const sub = req.subscription || {};
  res.json({
    hasAccess: hasAccess(sub),
    plan: sub.plan || 'free',
    status: subscriptionService.effectiveStatus(sub),
  });
});

// POST /api/access/activated — llamado por la página /activar tras confirmar
// la contraseña. Crea/actualiza el perfil en Firestore y registra analítica.
router.post('/activated', authenticate, async (req, res) => {
  try {
    const userDoc = (await store.getDoc('users', req.user.id)) || {};
    await store.setDoc('users', req.user.id, {
      ...userDoc,
      email: req.user.email || userDoc.email || null,
      activatedAt: userDoc.activatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const { trackEvent } = require('../services/analytics');
    await trackEvent({ userId: req.user.id, event: 'account_activated', meta: {} }).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    console.error(`[access] activated_upsert_failed userId=${req.user.id} error=${err.message}`);
    res.json({ ok: true }); // no bloquear al usuario por un fallo de auditoría
  }
});

// POST /api/access/resend-activation — público. Respuesta SIEMPRE genérica
// (no se revela si el email tiene compra o cuenta).
router.post('/resend-activation', resendLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.json({ ok: true, message: 'Si tu compra está confirmada, te llegará un correo en unos minutos.' });
  }
  try {
    await processor.resendActivationForEmail(email);
  } catch (err) {
    console.error(`[access] resend_error error=${err.message}`);
  }
  res.json({ ok: true, message: 'Si tu compra está confirmada, te llegará un correo en unos minutos.' });
});

// ---------- Endpoints solo para desarrollo/E2E (bloqueados en producción) ----------
if (!isProduction) {
  // POST /api/access/dev-grant — concede plan reto21 activo al usuario del token.
  router.post('/dev-grant', authenticate, async (req, res) => {
    const plan = req.body?.plan || 'reto21';
    const next = {
      ...(await store.getDoc('subscriptions', req.user.id)),
      status: 'active',
      plan,
      provider: 'dev-grant',
      updatedAt: new Date().toISOString(),
    };
    await store.setDoc('subscriptions', req.user.id, next);
    const { invalidateSubscriptionCache } = require('../middleware/auth');
    invalidateSubscriptionCache(req.user.id);
    res.json({ ok: true, subscription: next });
  });

  // GET /api/access/dev-outbox?email=... — últimos emails dry-run de ese destinatario.
  router.get('/dev-outbox', async (req, res) => {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email requerido' });
    const items = await store.queryDocs('mailOutbox', {
      filters: [{ field: 'to', op: '==', value: email }],
      orderBy: { field: 'sentAt', direction: 'desc' },
      limit: 5,
    });
    res.json({ items });
  });
}

module.exports = router;
