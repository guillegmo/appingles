// services/aiUsage.js
// Control de coste/uso de IA por usuario.
// Colección: aiUsage (doc por usuario y día: `${userId}_${date}`).
//
// El límite diario se aplica con una TRANSACCIÓN (reserve): el check y el
// incremento son atómicos, así N mensajes simultáneos no pueden pasarse del
// tope por una carrera check-then-act. Los tokens/coste reales se suman con
// incrementos atómicos sin lectura previa (0 lecturas).

const store = require('../lib/store');

function todayId(userId) {
  const date = new Date().toISOString().slice(0, 10);
  return { date, id: `${userId}_${date}` };
}

async function usedToday(userId, feature = 'tutor') {
  const { id } = todayId(userId);
  const doc = await store.getDoc('aiUsage', id);
  return doc && doc[feature] ? doc[feature].count : 0;
}

// Reserva 1 mensaje de forma atómica. Devuelve { ok, used }:
// ok=false cuando el conteo actual ya alcanzó el límite (no escribe).
async function reserve(userId, feature, limit) {
  const { date, id } = todayId(userId);
  return store.runTransaction((tx) => {
    return tx.get('aiUsage', id).then((doc) => {
      const current = doc && doc[feature] ? doc[feature] : { count: 0, tokens: 0, estimatedCost: 0 };
      const next = {
        count: current.count + 1,
        tokens: current.tokens || 0,
        estimatedCost: current.estimatedCost || 0,
      };
      if (next.count > limit) {
        return { ok: false, used: current.count };
      }
      tx.set('aiUsage', id, { ...(doc || {}), userId, date, [feature]: next });
      return { ok: true, used: next.count };
    });
  });
}

// Revierte una reserva (fallo de la IA). Delta atómico con clamp en >= 0.
async function release(userId, feature) {
  const { date, id } = todayId(userId);
  return store.runTransaction((tx) => {
    return tx.get('aiUsage', id).then((doc) => {
      if (!doc || !doc[feature]) return false;
      const current = doc[feature];
      const next = {
        count: Math.max(0, current.count - 1),
        tokens: current.tokens || 0,
        estimatedCost: current.estimatedCost || 0,
      };
      tx.set('aiUsage', id, { ...doc, [feature]: next });
      return true;
    });
  });
}

// Suma tokens/coste reales tras la respuesta de la IA (sin lectura).
async function addTokens(userId, feature, meta = {}) {
  const { date, id } = todayId(userId);
  await store.incrementDoc('aiUsage', id, {
    [`${feature}.tokens`]: meta.tokens || 0,
    [`${feature}.estimatedCost`]: meta.estimatedCost || 0,
    userId,
    date,
  });
  return true;
}

// Uso genérico atómico (ej. lecciones generadas): count+tokens+coste en una
// sola escritura de incrementos, sin lectura previa.
async function incrementUsage(userId, feature, meta = {}) {
  const { date, id } = todayId(userId);
  await store.incrementDoc('aiUsage', id, {
    [`${feature}.count`]: 1,
    [`${feature}.tokens`]: meta.tokens || 0,
    [`${feature}.estimatedCost`]: meta.estimatedCost || 0,
    userId,
    date,
  });
  return true;
}

module.exports = { usedToday, reserve, release, addTokens, incrementUsage, store };
