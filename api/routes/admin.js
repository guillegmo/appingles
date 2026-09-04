// routes/admin.js
// Admin de contenido: generar (IA), listar y publicar lecciones (draft -> published).
// Admin de usuarios: listar, activar/inactivar acceso, asignar contraseña temporal.
// Protegido: admin (dev: X-Dev-Admin=1).

const express = require('express');
const router = express.Router();
const contentGenerator = require('../services/contentGenerator');
const store = require('../lib/store');
const subscriptionService = require('../services/subscriptionService');
const provisioning = require('../services/provisioning');
const accountDeletion = require('../services/accountDeletion');
const analytics = require('../services/analytics');
const { ACCESS_STATUSES } = require('../services/hotmartProcessor');
const { authenticate, invalidateSubscriptionCache } = require('../middleware/auth');

function requireAdmin(req, res, next) {
  const isDev = process.env.AUTH_MODE !== 'firebase';
  const isAdmin = req.user.id === process.env.ADMIN_USER_ID || (isDev && req.header('X-Dev-Admin') === '1');
  if (!isAdmin) return res.status(403).json({ error: 'admin_required' });
  next();
}

router.use(authenticate, requireAdmin);

// Mismas reglas que ActivatePage.tsx (frontend) — duplicadas a propósito:
// la validación del backend es la que de verdad importa (nunca confiar solo
// en el cliente), la del frontend es solo para feedback inmediato.
const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, label: 'mínimo 8 caracteres' },
  { test: (p) => /[A-Z]/.test(p), label: 'una mayúscula' },
  { test: (p) => /[a-z]/.test(p), label: 'una minúscula' },
  { test: (p) => /[0-9]/.test(p), label: 'un número' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'un carácter especial' },
];

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

// GET /admin/users -> lista todos los usuarios con compra/acceso registrado.
// `subscriptions` es la fuente de verdad del acceso (ver services/hotmartProcessor.js),
// así que cualquier usuario real de la app tiene un documento ahí.
router.get('/users', async (req, res) => {
  const subs = await store.listDocs('subscriptions');
  const items = subs
    .map((s) => {
      const status = subscriptionService.effectiveStatus(s);
      return {
        userId: s.id,
        email: s.buyerEmail || null,
        name: s.buyerName || null,
        plan: s.plan || 'free',
        status,
        active: ACCESS_STATUSES.includes(status),
        updatedAt: s.updatedAt || null,
      };
    })
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  res.json({ items, total: items.length });
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CREATABLE_PLANS = ['reto21', 'premium-lifetime'];

// POST /admin/users -- body: { email, name?, plan, password }. Crea una
// cuenta nueva completa: usuario de Firebase Auth con esa contraseña +
// acceso activo (subscriptions), igual que si hubiera comprado. Solo para
// correos que AÚN NO tienen cuenta (409 si ya existe — usa "Cambiar
// contraseña" o "Activar" en la lista para gestionar una cuenta existente).
// Como el admin asigna la contraseña, se marca mustChangePassword.
router.post('/users', async (req, res) => {
  const { email, name, plan, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(normalizedEmail)) {
    return res.status(400).json({ error: 'email_invalido' });
  }
  const chosenPlan = CREATABLE_PLANS.includes(plan) ? plan : 'premium-lifetime';
  const failed = PASSWORD_RULES.filter((r) => !r.test(String(password || '')));
  if (failed.length) {
    return res.status(400).json({ error: 'password_invalida', requirements: failed.map((r) => r.label) });
  }

  let userId;
  let created;
  try {
    ({ userId, created } = await provisioning.findOrCreateAuthUser({ email: normalizedEmail, name }));
  } catch (err) {
    return res.status(500).json({ error: 'create_failed', message: err.message });
  }
  if (!created) {
    return res.status(409).json({ error: 'usuario_ya_existe', message: 'Ya existe una cuenta con ese correo.' });
  }

  try {
    await provisioning.setUserPassword(userId, password);
  } catch (err) {
    return res.status(500).json({ error: 'set_password_failed', message: err.message });
  }

  const updatedAt = new Date().toISOString();
  const subscription = {
    buyerEmail: normalizedEmail,
    buyerName: name || null,
    plan: chosenPlan,
    status: 'active',
    provider: 'admin-grant',
    mustChangePassword: true,
    updatedAt,
  };
  await store.setDoc('subscriptions', userId, subscription);
  invalidateSubscriptionCache(userId);

  await analytics.trackEvent({
    userId,
    event: 'admin_user_created',
    meta: { by: req.user.id, plan: chosenPlan },
  }).catch(() => {});

  res.status(201).json({
    ok: true,
    user: {
      userId,
      email: normalizedEmail,
      name: name || null,
      plan: chosenPlan,
      status: 'active',
      active: true,
      updatedAt,
    },
  });
});

// POST /admin/users/:userId/status -- body: { status }. Activa/inactiva el
// acceso del usuario (no borra nada: solo cambia el estado de su suscripción,
// igual que un evento real de Hotmart lo haría).
router.post('/users/:userId/status', async (req, res) => {
  const { status } = req.body || {};
  if (!subscriptionService.STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status_invalido', valid: subscriptionService.STATUSES });
  }
  const { userId } = req.params;
  const current = (await store.getDoc('subscriptions', userId)) || { plan: 'free' };
  const next = {
    ...current,
    status,
    adminUpdatedBy: req.user.id,
    updatedAt: new Date().toISOString(),
  };
  await store.setDoc('subscriptions', userId, next);
  invalidateSubscriptionCache(userId);
  await analytics.trackEvent({
    userId,
    event: 'admin_user_status_changed',
    meta: { status, by: req.user.id },
  }).catch(() => {});
  res.json({ ok: true, subscription: next });
});

// POST /admin/users/:userId/set-password -- body: { password }. El admin
// asigna directamente una contraseña temporal (para dársela al usuario por
// un canal seguro, ya que no hay email involucrado). Como el admin queda
// conociéndola, se marca mustChangePassword para forzar su reemplazo en el
// siguiente login (ver GET /subscription/status y POST /auth/password-changed).
router.post('/users/:userId/set-password', async (req, res) => {
  const { password } = req.body || {};
  const failed = PASSWORD_RULES.filter((r) => !r.test(String(password || '')));
  if (failed.length) {
    return res.status(400).json({ error: 'password_invalida', requirements: failed.map((r) => r.label) });
  }
  const { userId } = req.params;
  try {
    await provisioning.setUserPassword(userId, password);
  } catch (err) {
    return res.status(500).json({ error: 'set_password_failed', message: err.message });
  }
  const current = (await store.getDoc('subscriptions', userId)) || {};
  const next = { ...current, mustChangePassword: true, updatedAt: new Date().toISOString() };
  await store.setDoc('subscriptions', userId, next);
  invalidateSubscriptionCache(userId);
  await analytics.trackEvent({
    userId,
    event: 'admin_password_set',
    meta: { by: req.user.id },
  }).catch(() => {});
  res.json({ ok: true });
});

// DELETE /admin/users/:userId -- borra la cuenta POR COMPLETO: todos sus datos
// en Firestore (mismo alcance que el "derecho al olvido" de routes/privacy.js,
// ver services/accountDeletion.js) Y la cuenta de Firebase Auth (ya no puede
// iniciar sesión). Irreversible.
router.delete('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'no_puedes_borrar_tu_propia_cuenta' });
  }
  const sub = await store.getDoc('subscriptions', userId);
  const email = sub?.buyerEmail || null;

  const deletedDocs = await accountDeletion.deleteAllUserData(userId);
  invalidateSubscriptionCache(userId);

  let authDeleted = true;
  let authError = null;
  try {
    await provisioning.deleteAuthUser(userId);
  } catch (err) {
    // auth/user-not-found: la cuenta de Auth ya no existía (dato huérfano en
    // Firestore) — no es un fallo real, los datos igual se borraron.
    if (err?.code !== 'auth/user-not-found') {
      authDeleted = false;
      authError = err.message;
    }
  }

  await analytics.trackEvent({
    userId,
    event: 'admin_user_deleted',
    meta: { by: req.user.id, email, deletedDocs, authDeleted },
  }).catch(() => {});

  res.json({ ok: true, deletedDocs, authDeleted, authError });
});

module.exports = router;
