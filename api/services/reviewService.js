// services/reviewService.js
// Smart Review: construye tarjetas a partir de intentos fallidos y las
// programa con repetición espaciada (services/srs.js).

const store = require('../lib/store');
const content = require('../lib/content');
const srs = require('./srs');

// Crea (o actualiza) la tarjeta de un día a partir de un intento fallido.
// Key estable por día+palabra para no duplicar.
function cardKeyForDay(day) {
  return `day-${day}`;
}

async function ensureCard(userId, day) {
  const key = cardKeyForDay(day);
  const id = `${userId}_${key}`;
  const existing = await store.getDoc('reviewCards', id);
  if (existing) return existing;

  const dayContent = content.getDay(day);
  const word = dayContent?.vocabulary?.[0]?.en || null;
  const es = dayContent?.vocabulary?.[0]?.es || null;
  if (!word) return null;

  const card = {
    userId,
    key,
    day,
    word,
    es,
    repetitions: 0,
    intervalDays: 0,
    easeFactor: srs.EASE_BASE,
    dueDate: srs.dueKey(),
    lastResult: null,
    createdAt: new Date().toISOString(),
  };
  await store.setDoc('reviewCards', id, card);
  return card;
}

// Tarjetas que toca revisar hoy (top N). Incluye id para el frontend.
async function dueCards(userId, { limit = 20, today = new Date() } = {}) {
  const all = await store.listDocs('reviewCards');
  const mine = all.filter((c) => c.userId === userId);
  return srs.dueCards(mine, today)
    .slice(0, limit)
    .map((c) => ({ ...c, id: `${userId}_${c.key}` }));
}

// Registra el resultado de una revisión y reprograma la tarjeta.
// quality: 0 (fail) | 3 (hard) | 4 (good) | 5 (easy)
async function recordResult(userId, cardId, quality) {
  const id = cardId.includes(`${userId}_`) ? cardId : `${userId}_${cardId}`;
  const card = await store.getDoc('reviewCards', id);
  if (!card) return { ok: false, error: 'card_not_found' };

  const next = srs.schedule(card, quality);
  await store.setDoc('reviewCards', id, {
    ...card,
    ...next,
    lastResult: quality,
    lastReviewedAt: new Date().toISOString(),
  });
  await store.setDoc('reviewResults', `${userId}_${Date.now()}`, {
    userId,
    cardId: id,
    quality,
    at: new Date().toISOString(),
  });
  return { ok: true, card: { ...card, ...next, lastResult: quality } };
}

// Cuenta cuántas tarjetas hay para revisar hoy (para la Home).
async function countDue(userId, today = new Date()) {
  const all = await store.listDocs('reviewCards');
  const mine = all.filter((c) => c.userId === userId);
  return srs.dueCards(mine, today).length;
}

module.exports = { ensureCard, dueCards, recordResult, countDue, cardKeyForDay };
