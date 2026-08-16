// routes/auth.js
// Sesión única: registrar el sessionId activo del usuario.

const express = require('express');
const { verifyToken } = require('../middleware/auth');
const store = require('../lib/store');

const router = express.Router();

// Registra la sesión activa. El front lo llama justo después de autenticarse.
router.post('/session', verifyToken, async (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return res.status(400).json({ error: 'sessionId inválido' });
  }
  await store.setDoc('sessions', req.user.id, {
    activeSessionId: sessionId,
    updatedAt: new Date().toISOString(),
  });
  res.json({ ok: true });
});

module.exports = router;