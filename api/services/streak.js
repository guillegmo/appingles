// services/streak.js
// Pura y testeable: cálculo de rachas a partir de días completados.

function toDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dayKeyOffset(days, base = new Date()) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return toDayKey(d);
}

function daysBetween(aKey, bKey) {
  const a = new Date(aKey + 'T00:00:00Z');
  const b = new Date(bKey + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}

// completedKeys: array de 'YYYY-MM-DD' de días con práctica completada.
function computeStreaks(completedKeys, today = new Date()) {
  const set = new Set(completedKeys);
  const todayKey = toDayKey(today);

  // Streak actual: cuenta hacia atrás desde hoy. Si hoy aún no practicó,
  // la racha se mantiene contando desde ayer (todavía puede practicar hoy).
  let cursor = new Date(today);
  if (!set.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let currentStreak = 0;
  while (set.has(toDayKey(cursor))) {
    currentStreak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  // Racha más larga histórica
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const key of sorted) {
    if (prev !== null && daysBetween(prev, key) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = key;
  }

  return { currentStreak, longestStreak: longest, todayPracticed: set.has(todayKey) };
}

// Devuelve el número de días completados (deduplicado).
function daysCompleted(completedKeys) {
  return new Set(completedKeys).size;
}

module.exports = { toDayKey, dayKeyOffset, daysBetween, computeStreaks, daysCompleted };
