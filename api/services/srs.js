// services/srs.js
// Repetición espaciada graduada para el repaso inteligente.
// Quality: 0 (fallo completo) | 1 (muy difícil) | 2 (difícil) | 3 (aceptable)
//          | 4 (fácil) | 5 (dominado)
//
// Modelo de tarjeta (reviewCards):
//   { userId, key, word, es, repetitions, qualityHistory, easeFactor, dueDate, lastResult }
//
// Principios:
// - quality 0: reset a 1 día, easeFactor -0.3 (máxima penalización)
// - quality 1: 1-2 días, easeFactor -0.2
// - quality 2: 3 días, easeFactor -0.1
// - quality 3: 7 días, easeFactor sin cambios (baseline)
// - quality 4: 14 días, easeFactor +0.1
// - quality 5: 30 días, easeFactor +0.2 (máx 1.5)
// - Después de 3 quality-5 consecutivas, la palabra se marca "dominada" y
//   ya no aparece en repaso "difícil" sino en "mantenimiento" opcional.

const EASE_BASE = 2.5;
const EASE_MIN = 1.3;
const EASE_MAX = 1.5;

// Historial de quality por palabra: array de números 0-5
// Se usa para detectar "dominado" después de 3 quality-5 consecutivos.

// Intervalos base por nivel de repetición (días).
// Estos son los intervalos "puros" antes de aplicar el easeFactor.
const BASE_INTERVALS = [0, 1, 2, 3, 7, 14, 30, 60, 120];

// Factores de suavizado por quality al calcular el intervalo final.
// Un quality más alto multiplica el intervalo más fuertemente.
const QUALITY_MULTIPLIERS = [1.0, 0.8, 0.9, 1.0, 1.2, 1.4];

function dueKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// Programa la próxima revisación basándose en la quality (0-5).
// Devuelve { repetitions, intervalDays, easeFactor, dueDate, quality, dominant }.
function schedule({ repetitions = 0, qualityHistory = [], easeFactor = EASE_BASE }, quality, today = new Date()) {
  // Acumular quality en el historial
  const updatedQualityHistory = [...qualityHistory, quality].slice(-5); // mantener solo los últimos 5

  // Detectar si la palabra está "dominada": 3 quality-5 consecutivas
  const recently = updatedQualityHistory.slice(-3);
  const isDominant = recently.every(q => q === 5);

  if (quality === 0) {
    // Fallo completo: reset total, revísalo mañana con penalización.
    const next = {
      repetitions: 0,
      qualityHistory: updatedQualityHistory,
      intervalDays: 1,
      easeFactor: Math.max(EASE_MIN, easeFactor - 0.3),
    };
    const d = new Date(today);
    d.setDate(d.getDate() + next.intervalDays);
    return { ...next, dueDate: dueKey(d), quality, dominant: false };
  }

  if (quality === 1) {
    // Muy difícil: interval corto, ligera penalización.
    const next = {
      repetitions: repetitions + 1,
      qualityHistory: updatedQualityHistory,
      intervalDays: 1,
      easeFactor: Math.max(EASE_MIN, easeFactor - 0.2),
    };
    const d = new Date(today);
    d.setDate(d.getDate() + next.intervalDays);
    return { ...next, dueDate: dueKey(d), quality, dominant: false };
  }

  if (quality === 2) {
    // Difícil: interval moderado.
    const next = {
      repetitions: repetitions + 1,
      qualityHistory: updatedQualityHistory,
      intervalDays: 3,
      easeFactor: Math.max(EASE_MIN, easeFactor - 0.1),
    };
    const d = new Date(today);
    d.setDate(d.getDate() + next.intervalDays);
    return { ...next, dueDate: dueKey(d), quality, dominant: false };
  }

  // quality >= 3: acierto progresivo.
  const reps = repetitions + 1;
  const ef = Math.min(EASE_MAX, easeFactor + (quality === 5 ? 0.15 : 0.05));
  // Elegir intervalo base según el número de repeticiones previas.
  const baseIdx = Math.min(reps, BASE_INTERVALS.length - 1);
  const baseDays = BASE_INTERVALS[baseIdx];
  // Aplicar multiplicador según quality para diferenciación fina.
  const multiplier = QUALITY_MULTIPLIERS[quality] || 1.0;
  const nextInterval = Math.round(baseDays * multiplier);

  const d = new Date(today);
  d.setDate(d.getDate() + nextInterval);
  return {
    repetitions: reps,
    qualityHistory: updatedQualityHistory,
    intervalDays: nextInterval,
    easeFactor: +ef.toFixed(2),
    dueDate: dueKey(d),
    quality,
    dominant: isDominant,
  };
}

// Marcar una palabra como dominada manualmente o por acumulación.
// Retorna el nuevo estado de la card.
function markDominant(card) {
  card.dominant = true;
  card.intervalDays = 30; // mantenimiento cada 30 días
  card.easeFactor = Math.min(EASE_MAX, card.easeFactor + 0.1);
  const base = new Date(card.dueDate);
  base.setUTCDate(base.getUTCDate() + 30);
  card.dueDate = base.toISOString().slice(0, 10);
  return card;
}

// Devuelve las tarjetas que toca revisar hoy (dueDate <= todayKey).
// Además filtra por dominante si se quiere modo "mantenimiento only".
function dueCards(cards, today = new Date(), options = {}) {
  const key = dueKey(today);
  const { includeDominant = false } = options;

  return cards
    .filter((c) => {
      const MeetsDueDate = (c.dueDate || '1970-01-01') <= key;
      // Si no es modo mantenimiento, excluye dominadas; si es modo mantenimiento, solo las incluye.
      const NotDominant = !c.dominant || includeDominant;
      return MeetsDueDate && NotDominant;
    })
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
}

// Cuenta cuántas tarjetas hay para revisar hoy (para la Home).
function countDue(cards, today = new Date()) {
  const key = dueKey(today);
  return cards.filter((c) => (c.dueDate || '1970-01-01') <= key).length;
}

// Obtiene las palabras "difíciles": aquellas con easeFactor bajo O qualityHistory con muchos 0/1.
// Útil para el modo "Palabras difíciles" en el frontend.
function difficultCards(cards, today = new Date()) {
  const key = dueKey(today);
  return cards
    .filter((c) => (c.dueDate || '1970-01-01') <= key)
    .filter((c) => c.easeFactor < 2.5 || (c.qualityHistory && c.qualityHistory.some((q) => q <= 1)))
    .sort((a, b) => (a.easeFactor || 99) - (b.easeFactor || 99));
}

module.exports = {
  EASE_BASE,
  EASE_MIN,
  EASE_MAX,
  BASE_INTERVALS,
  QUALITY_MULTIPLIERS,
  schedule,
  dueCards,
  difficultCards,
  dueKey,
  markDominant,
  countDue,
};