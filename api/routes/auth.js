// routes/auth.js
// Sesión única: registrar el sessionId activo del usuario.
// También guarda el nombre (para leaderboard) si es la primera vez.

const express = require('express');
const { verifyToken, invalidateSubscriptionCache } = require('../middleware/auth');
const store = require('../lib/store');

const router = express.Router();

// Registra la sesión activa. El front lo llama justo después de autenticarse.
// Devuelve replaced=true si ya había otra sesión activa distinta (el dispositivo
// anterior quedará expulsado en su siguiente petición).
router.post('/session', verifyToken, async (req, res) => {
  const { sessionId, name } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return res.status(400).json({ error: 'sessionId inválido' });
  }
  const existing = await store.getDoc('sessions', req.user.id);
  const replaced = !!existing?.activeSessionId && existing.activeSessionId !== sessionId;
  await store.setDoc('sessions', req.user.id, {
    activeSessionId: sessionId,
    updatedAt: new Date().toISOString(),
  });
  if (name && typeof name === 'string') {
    const userDoc = (await store.getDoc('users', req.user.id)) || {};
    if (!userDoc.name) {
      await store.setDoc('users', req.user.id, { name: name.slice(0, 60), updatedAt: new Date().toISOString() });
    }
  }
  res.json({ ok: true, replaced });
});

// Cierra la sesión activa en el backend. Solo la borra si el sessionId enviado
// coincide con el activo: el logout de un dispositivo no debe expulsar a otro
// que tenga la sesión vigente.
router.delete('/session', verifyToken, async (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId requerido' });
  }
  const existing = await store.getDoc('sessions', req.user.id);
  if (existing?.activeSessionId === sessionId) {
    await store.setDoc('sessions', req.user.id, { activeSessionId: null, updatedAt: new Date().toISOString() });
  }
  res.json({ ok: true });
});

// Consulta la sesión activa (solo lectura). El front lo usa al restaurar una
// sesión automática para saber si este dispositivo/pestaña sigue teniendo el
// control, sin reclamarlo (evita el ping-pong entre pestañas).
router.get('/session', verifyToken, async (req, res) => {
  const existing = await store.getDoc('sessions', req.user.id);
  res.json({ activeSessionId: existing?.activeSessionId || null });
});

// Limpia el flag mustChangePassword tras un cambio forzado (contraseña
// asignada por un admin — ver POST /admin/users/:id/set-password). El
// usuario ya debe estar autenticado con la nueva contraseña que él mismo
// acaba de crear (updatePassword en el SDK cliente, antes de esta llamada).
router.post('/password-changed', verifyToken, async (req, res) => {
  const current = (await store.getDoc('subscriptions', req.user.id)) || {};
  if (current.mustChangePassword) {
    await store.setDoc('subscriptions', req.user.id, {
      ...current,
      mustChangePassword: false,
      updatedAt: new Date().toISOString(),
    });
    invalidateSubscriptionCache(req.user.id);
  }
  res.json({ ok: true });
});

module.exports = router;