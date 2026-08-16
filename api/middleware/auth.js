// middleware/auth.js
// Autenticación y autorización.
// AUTH_MODE=firebase -> valida token de Firebase Auth (producción).
// AUTH_MODE=dev -> acepta X-Dev-User (solo desarrollo local, nunca en producción).

const store = require('../lib/store');

const MODE = process.env.AUTH_MODE || 'dev';

async function verifyToken(req, res, next) {
  if (MODE === 'firebase') {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    try {
      store.initFirebase();
      const { getAuth } = require('firebase-admin/auth');
      const decoded = await getAuth().verifyIdToken(token);
      req.user = { id: decoded.uid, email: decoded.email };
    } catch {
      return res.status(401).json({ error: 'Token inválido' });
    }
  } else {
    const userId = req.header('X-Dev-User');
    if (!userId) return res.status(401).json({ error: 'X-Dev-User requerido en modo dev' });
    req.user = { id: userId };
  }
  next();
}

// Sesión única: si el usuario tiene una sesión activa registrada y esta petición
// no viene de ella, se rechaza para expulsar el dispositivo anterior.
async function enforceSession(req, res, next) {
  if (MODE !== 'firebase') return next(); // solo en producción
  const sessionId = req.header('X-Session-Id');
  try {
    const sess = await store.getDoc('sessions', req.user.id);
    if (sess && sess.activeSessionId) {
      if (!sessionId || sessionId !== sess.activeSessionId) {
        return res.status(401).json({
          error: 'Tu sesión se cerró porque iniciaste sesión en otro dispositivo',
          code: 'SESSION_EXPIRED',
        });
      }
    }
  } catch (e) {
    // Si falla la lectura de sesión, no bloquear por seguridad.
  }
  next();
}

async function authenticate(req, res, next) {
  const proceed = async () => {
    req.subscription = (await store.getDoc('subscriptions', req.user.id)) || { status: 'free', plan: 'free' };
    await enforceSession(req, res, next);
  };
  verifyToken(req, res, proceed);
}

module.exports = { authenticate, verifyToken, MODE };
