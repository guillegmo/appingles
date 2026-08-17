// routes/auth.js
// Sesión única: registrar el sessionId activo del usuario.
// También guarda el nombre (para leaderboard) si es la primera vez.

const express = require('express');
const { verifyToken } = require('../middleware/auth');
const store = require('../lib/store');

const router = express.Router();

// Registra la sesión activa. El front lo llama justo después de autenticarse.
router.post('/session', verifyToken, async (req, res) => {
  const { sessionId, name } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return res.status(400).json({ error: 'sessionId inválido' });
  }
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
  res.json({ ok: true });
});

module.exports = router;