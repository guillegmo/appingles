// services/reviewService.js
// Smart Review: construye tarjetas a partir de intentos fallidos y las
// programa con repetición espaciada palabra-level (services/srs.js).

const store = require('../lib/store');
const content = require('../lib/content');
const srs = require('./srs');
const { markDominant } = srs;
const { normalizeProgress } = require('../lib/progress');

// ---------------------------------------------------------------------------
// Key: por día + índice de palabra, para que cada palabra tenga tarjeta propia.
// ---------------------------------------------------------------------------
function cardKey(userId, day, wordIndex) {
  return `${userId}_day${day}_w${wordIndex}`;
}

// ---------------------------------------------------------------------------
// Crea (o actualiza) las tarjetas de todas las palabras de un día a partir
// de un intento fallido. Una palabra = un estado SRS independiente.
// ---------------------------------------------------------------------------
async function ensureCards(userId, day) {
  const dayContent = content.getDay(day);
  if (!dayContent || !dayContent.vocabulary || dayContent.vocabulary.length === 0) return [];

  // Lectura por lotes de las tarjetas existentes del día (1 query en vez de
  // un getDoc por palabra). Los ids son deterministas: `${userId}_day${day}_w${i}`.
  const ids = dayContent.vocabulary.map((_, i) => `${userId}_day${day}_w${i}`);
  const existingDocs = await store.getDocs('reviewCards', ids);
  const existingById = new Map(existingDocs.map((c) => [c.id, c]));

  const cards = [];
  const toCreate = [];
  for (let i = 0; i < dayContent.vocabulary.length; i++) {
    const vocabItem = dayContent.vocabulary[i];
    const id = `${userId}_day${day}_w${i}`;
    const existing = existingById.get(id);
    if (existing) {
      cards.push(existing);
      continue;
    }
    toCreate.push({
      id,
      card: {
        userId,
        key: `day${day}_w${i}`,
        day,
        word: vocabItem.en,
        es: vocabItem.es,
        repetitions: 0,
        qualityHistory: [],
        easeFactor: srs.EASE_BASE,
        dueDate: srs.dueKey(), // mañana
        lastResult: null,
        dominant: false,
        createdAt: new Date().toISOString(),
      },
    });
  }

  // Escritura de las nuevas en un solo lote (1 round trip en Firestore).
  if (toCreate.length) {
    await store.batchWrite(toCreate.map(({ id, card }) => ({ collection: 'reviewCards', id, data: card })));
    for (const { card } of toCreate) cards.push(card);
  }
  return cards;
}

// ---------------------------------------------------------------------------
// Contexto para una tarjeta: busca la frase del día que contiene la palabra
// (para que el ejemplo tenga sentido con la palabra revisada). Si ninguna la
// contiene, devuelve la propia palabra como contexto — NUNCA una frase ajena,
// para que la palabra siempre concuerde con lo que se muestra.
// ---------------------------------------------------------------------------
function exampleFor(dayContent, word, es = null) {
  const phrases = dayContent?.phrases;
  if (!Array.isArray(phrases) || phrases.length === 0) return null;
  const base = String(word || '')
    .trim()
    .replace(/\s+\.\.\.$/i, '')
    .replace(/[.!?]+$/i, '')
    .trim();
  const stems = base ? [base] : [];
  // Estructuras en forma base (p.ej. "be going to") no aparecen literalmente;
  // se relaja quitando el "be" inicial para matchear "I am going to...".
  if (/^be\s/i.test(base)) stems.push(base.replace(/^be\s/i, ''));
  for (const stem of stems) {
    const needle = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${needle}\\b`, 'i');
    const found = phrases.find((p) => p.en && re.test(p.en));
    if (found) return found;
  }
  return { en: word, es };
}

// Añade { example, exampleEs } a cada tarjeta según su palabra.
function enrichWithExamples(userId, cards) {
  const cache = {};
  return cards.map((c) => {
    const dayContent = c.day in cache ? cache[c.day] : (cache[c.day] = content.getDay(c.day));
    const phrase = exampleFor(dayContent, c.word, c.es);
    return {
      ...c,
      id: `${userId}_${c.key}`,
      example: phrase?.en || null,
      exampleEs: phrase?.es || null,
    };
  });
}

// ---------------------------------------------------------------------------
// Tarjetas que toca revisar hoy (SRS). Usa las funciones graduadas de srs.js.
// ---------------------------------------------------------------------------
async function dueCards(userId, { limit = 20, today = new Date() } = {}) {
  const all = await store.queryDocs('reviewCards', { filters: [{ field: 'userId', op: '==', value: userId }] });
  const mine = all;

  // Usar la nueva función dueCards graduada
  const due = srs.dueCards(mine, today);

  return enrichWithExamples(userId, due.slice(0, limit));
}

// ---------------------------------------------------------------------------
// Registra el resultado de una revisión palabra-level, reprograma la tarjeta
// y otorga XP si la recordó (quality >= 3).
// quality: 0 (fallo completo) | 1 (muy difícil) | 2 (difícil) | 3 (aceptable)
//          | 4 (fácil) | 5 (dominado)
// ---------------------------------------------------------------------------
async function recordResult(userId, cardId, quality) {
  const id = cardId.includes(`${userId}_`) ? cardId : `${userId}_${cardId}`;

  // Transaccional: tarjeta + resultado + XP/progreso se aplican de forma
  // atómica. Doble clic u otras revisiones simultáneas no duplican XP ni
  // pierden reprogramaciones (read->modify->write atómico).
  return store.runTransaction(async (tx) => {
    // Firestore exige ejecutar TODAS las lecturas antes de cualquier escritura.
    const card = await tx.get('reviewCards', id);
    if (!card) return { ok: false, error: 'card_not_found' };
    const progress = quality >= 3 ? normalizeProgress(await tx.get('progress', userId)) : null;

    // Ejecutar schedule graduado
    const next = srs.schedule(
      {
        repetitions: card.repetitions,
        qualityHistory: card.qualityHistory,
        easeFactor: card.easeFactor,
      },
      quality,
    );

    const updated = {
      ...card,
      ...next,
      lastResult: quality,
      lastReviewedAt: new Date().toISOString(),
    };

    tx.set('reviewCards', id, updated);

    // Registrar el resultado en el historial
    tx.set('reviewResults', `${userId}_${Date.now()}`, {
      userId,
      cardId: id,
      quality,
      at: new Date().toISOString(),
    });

    // XP y progreso (solo si quality >= 3 = "aceptable" o mejor)
    let xpEarned = 0;

    if (quality >= 3) {
      // Tabla XP por quality
      const XP_TABLE = { 3: 5, 4: 10, 5: 15 };
      xpEarned = XP_TABLE[quality] || 5;

      const todayKey = new Date().toISOString().slice(0, 10);
      if (!progress.practiceDays.includes(todayKey)) progress.practiceDays.push(todayKey);
      progress.totalXp += xpEarned;
      tx.set('progress', userId, progress);
    }

    // Verificar si la palabra acaba de dominarse (3 quality-5 consecutivas)
    // El frontend puede llamar a markDominant si lo desea, pero aquí también lo
    // detectamos automáticamente si la card ya tiene dominante = true por la
    // lógica de schedule, o si el qualityHistory tiene 3 veces el 5 al final.
    const recently = updated.qualityHistory.slice(-3);
    const justBecameDominant = recently.every((q) => q === 5) && updated.qualityHistory.length >= 3;

    return {
      ok: true,
      card: {
        ...updated,
        xpEarned,
        totalXp: progress.totalXp,
        dominant: justBecameDominant || updated.dominant,
        // Marcar dominante si corresponde
        ...(justBecameDominant ? markDominant(updated) : {}),
      },
      xpEarned,
      totalXp: progress.totalXp,
    };
  });
}

// ---------------------------------------------------------------------------
// Cuenta cuántas tarjetas hay para revisar hoy (para la Home).
// ---------------------------------------------------------------------------
async function countDue(userId, today = new Date()) {
  const all = await store.queryDocs('reviewCards', { filters: [{ field: 'userId', op: '==', value: userId }] });
  const mine = all;
  return srs.countDue(mine, today);
}

// ---------------------------------------------------------------------------
// Nuevos endpoints de ayuda:
//
// GET /review/difficult  -> tarjetas con easeFactor bajo o calidad mala
// GET /review/pool       -> TODAS las palabras falladas jamás (Premium):
//                           free: límite 20, premium: sin límite
// ---------------------------------------------------------------------------
async function getDifficultCards(userId, { limit = 15, today = new Date() } = {}) {
  const all = await store.queryDocs('reviewCards', { filters: [{ field: 'userId', op: '==', value: userId }] });
  const mine = all;
  return enrichWithExamples(userId, srs.difficultCards(mine, today).slice(0, limit));
}

async function getPoolCards(userId, { limit = Infinity, today = new Date() } = {}) {
  const all = await store.queryDocs('reviewCards', { filters: [{ field: 'userId', op: '==', value: userId }] });
  const mine = all;
  const key = today.toISOString().slice(0, 10);
  // Pool = todas las tarjetas creadas para este usuario, sin filtrar por dueDate.
  // Limitado por entitlement en el controlador.
  return enrichWithExamples(userId, mine.slice(0, limit));
}

module.exports = {
  ensureCards,
  dueCards,
  recordResult,
  countDue,
  getDifficultCards,
  getPoolCards,
  exampleFor,
  cardKeyForDay: function (day) { return `day-${day}`; },
};



