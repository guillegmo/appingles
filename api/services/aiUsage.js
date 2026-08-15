// services/aiUsage.js
// Control de coste/uso de IA por usuario (V1 prepara la estructura; V3 lo conecta).
// Colección: aiUsage

const store = require('../lib/store');

async function usedToday(userId, feature = 'tutor') {
  const date = new Date().toISOString().slice(0, 10);
  const doc = await store.getDoc('aiUsage', `${userId}_${date}`);
  return doc && doc[feature] ? doc[feature].count : 0;
}

async function incrementUsage(userId, feature, meta = {}) {
  const date = new Date().toISOString().slice(0, 10);
  const id = `${userId}_${date}`;
  const doc = await store.getDoc('aiUsage', id);
  const current = doc && doc[feature] ? doc[feature] : { count: 0, tokens: 0, estimatedCost: 0 };
  const next = {
    count: current.count + 1,
    tokens: current.tokens + (meta.tokens || 0),
    estimatedCost: current.estimatedCost + (meta.estimatedCost || 0),
  };
  await store.setDoc('aiUsage', id, { ...(doc || {}), userId, date, [feature]: next });
  return next;
}

module.exports = { usedToday, incrementUsage, store };
