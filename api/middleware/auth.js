// middleware/auth.js
// Autenticación y autorización.
// AUTH_MODE=firebase -> valida token de Firebase Auth (producción).
// AUTH_MODE=dev -> acepta X-Dev-User (solo desarrollo local, nunca en producción).

const store = require('../lib/store');

const MODE = process.env.AUTH_MODE || 'dev';

async function authenticate(req, res, next) {
  const userId = req.header('X-Dev-User');

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
    if (!userId) return res.status(401).json({ error: 'X-Dev-User requerido en modo dev' });
    req.user = { id: userId };
  }

  // Cargar subscription para entitlements
  req.subscription = (await store.getDoc('subscriptions', req.user.id)) || { status: 'free', plan: 'free' };
  next();
}

module.exports = { authenticate, MODE };
