// services/aiUsage.js
// Control de coste/uso de IA por usuario (V1 prepara la estructura; V3 lo conecta).
// Colección: aiUsage

const store = require('../lib/store');

async function usedToday(userId, feature = 'tutor') {
  const date = new Date().toISOString().slice(0, 10);
  const doc = await store.getDoc('aiUsage', `${userId}_${date}`);
  return doc && doc[feature] ? doc[feature].count : 0;
}

// Ajusta el uso diario con deltas (count/tokens/cost pueden ser negativos para
// revertir una reserva). Devuelve el valor actualizado de la feature.
async function addUsage(userId, feature, deltas = {}) {
  const date = new Date().toISOString().slice(0, 10);
  const id = `${userId}_${date}`;
  const doc = await store.getDoc('aiUsage', id);
  const current = doc && doc[feature] ? doc[feature] : { count: 0, tokens: 0, estimatedCost: 0 };
  const next = {
    count: Math.max(0, current.count + (deltas.count || 0)),
    tokens: Math.max(0, current.tokens + (deltas.tokens || 0)),
    estimatedCost: Math.max(0, current.estimatedCost + (deltas.estimatedCost || 0)),
  };
  await store.setDoc('aiUsage', id, { ...(doc || {}), userId, date, [feature]: next });
  return next;
}

async function incrementUsage(userId, feature, meta = {}) {
  return addUsage(userId, feature, {
    count: 1,
    tokens: meta.tokens || 0,
    estimatedCost: meta.estimatedCost || 0,
  });
}

module.exports = { usedToday, incrementUsage, addUsage, store };
