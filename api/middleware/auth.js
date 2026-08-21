// middleware/auth.js
// Autenticación y autorización.
// Modo híbrido:
//  - Si llega un Bearer token de Firebase Auth, se valida con Firebase Admin.
//  - Si AUTH_MODE != firebase (desarrollo local) y no hay token, acepta X-Dev-User.
// En producción (AUTH_MODE=firebase) X-Dev-User queda bloqueado: solo tokens reales.

const store = require('../lib/store');

const MODE = process.env.AUTH_MODE || 'dev';
const ALLOW_DEV_USER = MODE !== 'firebase';

// Caché en memoria de corta duración para el documento 'subscriptions' del
// usuario: se lee en CADA request autenticado (verifyToken -> authenticate).
// Un TTL corto + invalidación explícita en cada escritura evita lecturas
// repetidas sin riesgo de entitlements obsoletos (las sesiones NUNCA se
// cachean: la sesión única depende de leer 'sessions' fresco en cada request).
const SUB_CACHE_TTL_MS = 10_000;
const subscriptionCache = new Map();

function invalidateSubscriptionCache(userId) {
  if (userId) subscriptionCache.delete(userId);
}

async function getSubscription(userId) {
  const hit = subscriptionCache.get(userId);
  if (hit && Date.now() - hit.ts < SUB_CACHE_TTL_MS) return { ...hit.value };
  const value = (await store.getDoc('subscriptions', userId)) || { status: 'free', plan: 'free' };
  subscriptionCache.set(userId, { ts: Date.now(), value });
  return { ...value };
}

async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');

  // 1) Token real de Firebase (válido en cualquier modo, útil para E2E y producción).
  if (token) {
    try {
      store.initFirebase();
      const { getAuth } = require('firebase-admin/auth');
      const decoded = await getAuth().verifyIdToken(token);
      req.user = { id: decoded.uid, email: decoded.email };
    } catch {
      return res.status(401).json({ error: 'Token inválido' });
    }
    return next();
  }

  // 2) Usuario de desarrollo (solo cuando no estamos en modo producción).
  if (ALLOW_DEV_USER) {
    const userId = req.header('X-Dev-User');
    if (userId) {
      req.user = { id: userId };
      return next();
    }
  }

  return res.status(401).json({
    error: ALLOW_DEV_USER ? 'Token o X-Dev-User requerido' : 'Token requerido',
  });
}

// Sesión única: si el usuario tiene una sesión activa registrada y esta petición
// no viene de ella, se rechaza para expulsar el dispositivo/pestaña anterior.
// Corre en todos los modos: en dev cada pestaña tiene su propio sessionId, así
// que iniciar sesión en otra pestaña expulsa la anterior.
// fetched=true indica que authenticate ya leyó el doc (aunque sea null) y no
// debe releerse: sin el flag, la ausencia de doc provocaba una 2ª lectura.
async function enforceSession(req, res, next, sess, fetched = false) {
  const sessionId = req.header('X-Session-Id');
  try {
    if (!fetched) sess = await store.getDoc('sessions', req.user.id);
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
    // Lecturas en paralelo: sesión + suscripción (antes eran 2 round trips seriales).
    // Si falla la lectura de sesión NO bloqueamos (mismo comportamiento que antes:
    // enforceSession traga el error por seguridad); si falla la de suscripción se
    // comporta igual que antes (500), sin cambios.
    const [sess, subscription] = await Promise.all([
      store.getDoc('sessions', req.user.id).catch(() => null),
      getSubscription(req.user.id),
    ]);
    req.subscription = subscription;
    await enforceSession(req, res, next, sess, true);
  };
  verifyToken(req, res, proceed);
}

module.exports = { authenticate, verifyToken, MODE, invalidateSubscriptionCache };
