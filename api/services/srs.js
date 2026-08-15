// services/srs.js
// Repetición espaciada (SM-2 simplificado) para las tarjetas de repaso.
// Pura y testeable: dado un intento (correcto/incorrecto), recalcula
// el intervalo y la fecha de próxima revisión.
//
// Modelo de tarjeta (colección 'reviewCards'):
//   { userId, key, word, es, repetitions, intervalDays, easeFactor, dueDate, lastResult }

const EASE_BASE = 2.5;
const EASE_MIN = 1.3;

// Incrementos de intervalo por nivel de repetición (días).
const INTERVALS = [0, 1, 3, 7, 14, 30, 60, 120];

function dueKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// SM-2 simplificado. quality: 0 (fail) | 3 (hard) | 4 (good) | 5 (easy).
// Devuelve { repetitions, intervalDays, easeFactor, dueDate }.
function schedule({ repetitions = 0, intervalDays = 0, easeFactor = EASE_BASE }, quality, today = new Date()) {
  if (quality < 3) {
    // Fallo: reset repeticiones, revísalo mañana.
    const next = {
      repetitions: 0,
      intervalDays: 1,
      easeFactor: Math.max(EASE_MIN, easeFactor - 0.2),
    };
    const d = new Date(today);
    d.setDate(d.getDate() + next.intervalDays);
    return { ...next, dueDate: dueKey(d) };
  }

  const reps = repetitions + 1;
  const ef = Math.max(EASE_MIN, easeFactor + (quality === 5 ? 0.1 : 0));
  // Primera repetición -> 1 día, segunda -> 3, luego intervalo * EF.
  const nextInterval = reps <= INTERVALS.length - 1
    ? INTERVALS[reps]
    : Math.round(INTERVALS[INTERVALS.length - 1] * ef);

  const d = new Date(today);
  d.setDate(d.getDate() + nextInterval);
  return { repetitions: reps, intervalDays: nextInterval, easeFactor: +ef.toFixed(2), dueDate: dueKey(d) };
}

// Devuelve las tarjetas que toca revisar hoy (dueDate <= todayKey).
function dueCards(cards, today = new Date()) {
  const key = dueKey(today);
  return cards
    .filter((c) => (c.dueDate || '1970-01-01') <= key)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
}

module.exports = { EASE_BASE, EASE_MIN, INTERVALS, schedule, dueCards, dueKey };
