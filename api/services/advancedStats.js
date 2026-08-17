// services/advancedStats.js
// Analytics avanzados del usuario (Premium IA, V7).
// Agrega precisión por ejercicio, puntaje de pronunciación, uso de IA,
// vocabulario capturado, speaking, XP/racha y perfil de habilidades.
// Sin lógica de negocio: solo agrega datos existentes del store.

const store = require('../lib/store');

const DAYS_KEYS = { 7: 7, 30: 30 };

function dayKey(offset, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function lastNDaysKeys(n, base = new Date()) {
  return Array.from({ length: n }, (_, i) => dayKey(n - 1 - i, base));
}

// Precisión sobre un conjunto de intentos.
function accuracy(attempts) {
  const total = attempts.length;
  const correct = attempts.filter((a) => a.correct).length;
  return { attempts: total, correct, accuracyPct: total ? Math.round((correct / total) * 100) : 0 };
}

// Serie diaria { date, attempts, correct, accuracyPct, xp } para los últimos n días.
function dailySeries(attempts, n, base = new Date()) {
  const keys = lastNDaysKeys(n, base);
  const buckets = {};
  for (const a of attempts) {
    const k = (a.at || '').slice(0, 10);
    if (!keys.includes(k)) continue;
    if (!buckets[k]) buckets[k] = { attempts: 0, correct: 0, xp: 0 };
    buckets[k].attempts += 1;
    if (a.correct) buckets[k].correct += 1;
    buckets[k].xp += a.xpEarned || 0;
  }
  return keys.map((k) => {
    const b = buckets[k] || { attempts: 0, correct: 0, xp: 0 };
    return {
      date: k,
      attempts: b.attempts,
      correct: b.correct,
      accuracyPct: b.attempts ? Math.round((b.correct / b.attempts) * 100) : 0,
      xp: b.xp,
    };
  });
}

// Uso de IA total y de hoy (sin exponer costo al usuario).
async function aiUsage(userId, today = new Date(), deps = {}) {
  const s = deps.store || store;
  const docs = await s.listDocs('aiUsage');
  const mine = docs.filter((d) => d.userId === userId);
  const todayKey = today.toISOString().slice(0, 10);
  let totalSessions = 0;
  let totalTokens = 0;
  let usedToday = 0;
  for (const d of mine) {
    for (const feature of ['tutor', 'content']) {
      const f = d[feature];
      if (!f) continue;
      totalSessions += f.count || 0;
      totalTokens += f.tokens || 0;
      if (d.date === todayKey) usedToday += f.count || 0;
    }
  }
  return { totalSessions, totalTokens, usedToday };
}

// Puntaje de pronunciación: promedio, mejor y últimas N.
async function pronunciationStats(userId, limit = 10, deps = {}) {
  const s = deps.store || store;
  const docs = await s.listDocs('pronunciationScores');
  const mine = docs.filter((d) => d.userId === userId).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  const scores = mine.map((m) => m.score || 0);
  const avg = scores.length ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 10) / 10 : 0;
  const best = scores.length ? Math.max(...scores) : 0;
  return {
    attempts: mine.length,
    averageScore: avg,
    bestScore: best,
    recent: mine.slice(0, limit).map((m) => ({ target: m.target || '', score: m.score || 0, at: m.at })),
  };
}

async function advancedStats(userId, opts = {}) {
  const days = DAYS_KEYS[Number(opts.days) || 7] || 7;
  const today = opts.today ? new Date(opts.today) : new Date();
  const s = (opts.deps && opts.deps.store) || store;

  const progress = (await s.getDoc('progress', userId)) || { completedDays: [], practiceDays: [], totalXp: 0, exercisesCompleted: 0, speakingSessions: 0 };
  const streaks = (await s.getDoc('streaks', userId)) || { currentStreak: 0, longestStreak: 0 };
  const badges = (await s.getDoc('badges', userId)) || { earned: [] };
  const profileDoc = await s.getDoc('profiles', userId);

  const attempts = (await s.listDocs('exerciseAttempts')).filter((a) => a.userId === userId);
  const lastN = attempts.filter((a) => (a.at || '').slice(0, 10) >= dayKey(days - 1, today));

  const vocabDoc = (await s.getDoc('vocabulary', userId)) || { items: [] };
  const ai = await aiUsage(userId, today, { store: s });
  const pron = await pronunciationStats(userId, 10, { store: s });

  return {
    period: { days, end: today.toISOString().slice(0, 10) },
    overview: {
      totalXp: progress.totalXp || 0,
      exercisesCompleted: progress.exercisesCompleted || 0,
      speakingSessions: progress.speakingSessions || 0,
      daysCompleted: progress.completedDays?.length || 0,
      vocabularyCount: vocabDoc.items?.length || 0,
      practiceThisWeek: (progress.practiceDays || []).filter((d) => d >= dayKey(6, today)).length,
      currentStreak: streaks.currentStreak || 0,
      longestStreak: streaks.longestStreak || 0,
      streakFreezes: progress.streakFreezes || 0,
      badges: badges.earned || [],
    },
    accuracy: {
      overall: accuracy(attempts),
      lastN: accuracy(lastN),
    },
    series: dailySeries(attempts, days, today),
    pronunciation: pron,
    ai: ai,
    skills: profileDoc?.profile || null,
  };
}

module.exports = { advancedStats, dailySeries, accuracy, pronunciationStats, DAYS_KEYS };