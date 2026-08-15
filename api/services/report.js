// services/report.js
// Reportes semanales: tiempo, speaking, vocabulario, precisión, fortalezas.

const store = require('../lib/store');
const streak = require('./streak');
const scoring = require('./scoring');

const MINUTES_PER_PRACTICE_DAY = 15;
const MINUTES_PER_SPEAKING_SESSION = 5;
const VOCAB_PER_DAY = 8;
const WEEKLY_GOAL_DAYS = 5;

function dateKey(offset, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// Reporte de los últimos 7 días (incluye hoy).
async function weeklyReport(userId, today = new Date(), deps = {}) {
  const s = deps.store || store;
  const progress = (await s.getDoc('progress', userId)) || {};
  const profileDoc = await s.getDoc('profiles', userId);
  const profile = profileDoc?.profile || null;
  const practiceDays = progress.practiceDays || [];
  const attempts = (await s.listDocs('exerciseAttempts')).filter((a) => a.userId === userId);

  const weekStart = dateKey(-6, today);
  const weekKeys = new Set(Array.from({ length: 7 }, (_, i) => dateKey(i - 6, today)));
  const daysThisWeek = practiceDays.filter((d) => weekKeys.has(d));

  const weekAttempts = attempts.filter((a) => a.at >= `${weekStart}T00:00:00Z`);
  const correct = weekAttempts.filter((a) => a.correct).length;
  const accuracy = weekAttempts.length ? Math.round((correct / weekAttempts.length) * 100) : 0;

  const newDaysCompleted = progress.completedDays?.length ?? 0;

  const minutes =
    daysThisWeek.length * MINUTES_PER_PRACTICE_DAY +
    (progress.speakingSessions || 0) * MINUTES_PER_SPEAKING_SESSION;

  const vocab = newDaysCompleted * VOCAB_PER_DAY;

  // Skills: mejor fuerte del perfil; foco = debilidad.
  const strongest = profile?.strongestSkill || 'vocabulary';
  const focus = profile?.needsImprovement?.[0] || 'speaking';

  const { currentStreak, longestStreak } = streak.computeStreaks(practiceDays, today);

  return {
    period: { start: weekStart, end: today.toISOString().slice(0, 10) },
    practiceMinutes: minutes,
    speakingMinutes: (progress.speakingSessions || 0) * MINUTES_PER_SPEAKING_SESSION,
    vocabulary: vocab,
    accuracy,
    strongestSkill: strongest,
    focusNextWeek: focus,
    daysPracticed: daysThisWeek.length,
    weeklyGoal: { targetDays: WEEKLY_GOAL_DAYS, achieved: daysThisWeek.length },
    currentStreak,
    longestStreak,
  };
}

module.exports = { weeklyReport, MINUTES_PER_PRACTICE_DAY, MINUTES_PER_SPEAKING_SESSION, VOCAB_PER_DAY, WEEKLY_GOAL_DAYS };
