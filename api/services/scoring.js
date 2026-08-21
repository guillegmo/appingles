// services/scoring.js
// Pura y testeable: XP, niveles, badges, evaluación post-21 y perfil.

// ---------- XP ----------

const XP = {
  completeDayBase: 40,
  exerciseCorrect: 5,
  speakingSession: 10,
  challengeComplete: 15,
  streakBonus: 5,
  reviewCorrect: 10,
};

// ---------- Niveles (competencias, no etiquetas) ----------

const LEVELS = [
  { key: 'beginner', label: 'Principiante', minXp: 0 },
  { key: 'elementary', label: 'Básico', minXp: 800 },
  { key: 'pre-intermediate', label: 'Pre-intermedio', minXp: 2200 },
  { key: 'intermediate', label: 'Intermedio', minXp: 4500 },
];

function levelForXp(xp) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.minXp) current = l;
  return current;
}

function progressToNextLevel(xp) {
  const idx = LEVELS.findIndex((l) => l.key === levelForXp(xp).key);
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1];
  if (!next) return { pct: 100, current, next: null };
  const span = next.minXp - current.minXp;
  const pct = Math.min(100, Math.round(((xp - current.minXp) / span) * 100));
  return { pct, current, next };
}

// ---------- Badges ----------

const BADGES = [
  { id: 'first-day', label: 'Primer día', desc: 'Completa el día 1', rule: { type: 'daysCompleted', gte: 1 } },
  { id: 'streak-3', label: 'Racha de 3 días', desc: '3 días seguidos', rule: { type: 'currentStreak', gte: 3 } },
  { id: 'streak-7', label: 'Racha de 7 días', desc: '7 días seguidos', rule: { type: 'currentStreak', gte: 7 } },
  { id: 'streak-14', label: 'Racha de 14 días', desc: '14 días seguidos', rule: { type: 'currentStreak', gte: 14 } },
  { id: 'streak-30', label: 'Racha de 30 días', desc: '30 días seguidos', rule: { type: 'currentStreak', gte: 30 } },
  { id: 'halfway', label: 'A mitad de camino', desc: 'Completa 10 días', rule: { type: 'daysCompleted', gte: 10 } },
  { id: 'champion-21', label: 'Campeón de 21 días', desc: 'Completa el reto de 21 días', rule: { type: 'daysCompleted', gte: 21 } },
  { id: 'speaking-starter', label: 'Primer paso al hablar', desc: 'Termina tu primera sesión de habla', rule: { type: 'speakingSessions', gte: 1 } },
  { id: 'conversation-builder', label: 'Constructor de conversación', desc: '10 sesiones de habla', rule: { type: 'speakingSessions', gte: 10 } },
  { id: 'practice-master', label: 'Maestro de práctica', desc: '50 ejercicios completados', rule: { type: 'exercisesCompleted', gte: 50 } },
];

function evaluateBadges(stats) {
  return BADGES.filter((b) => {
    const r = b.rule;
    switch (r.type) {
      case 'daysCompleted': return stats.daysCompleted >= r.gte;
      case 'currentStreak': return stats.currentStreak >= r.gte;
      case 'speakingSessions': return stats.speakingSessions >= r.gte;
      case 'exercisesCompleted': return stats.exercisesCompleted >= r.gte;
      default: return false;
    }
  }).map((b) => b.id);
}

// ---------- Evaluación post-21 ----------

const SKILL_KEYS = ['speaking', 'listening', 'vocabulary', 'conversation', 'grammar', 'confidence'];

function computeProfile(scores) {
  const entries = SKILL_KEYS.map((k) => ({ key: k, score: scores[k] ?? 0 }));
  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  // Las dos habilidades más débiles definen el foco de mejora.
  const weakest = [...entries].sort((a, b) => a.score - b.score).slice(0, 2).map((e) => e.key);
  const avg = Math.round(entries.reduce((s, e) => s + e.score, 0) / entries.length);

  return {
    level: avg >= 70 ? 'Principiante+' : 'Principiante',
    strongestSkill: strongest.key,
    needsImprovement: weakest,
    averageScore: avg,
    scores: Object.fromEntries(entries.map((e) => [e.key, e.score])),
    recommendedPractice: '15 min por día',
  };
}

function pickPlanVariant(plans, profile) {
  const weakest = profile.needsImprovement[0];
  const found = plans.variants.find((v) => v.condition === `weakest: ${weakest}`) || plans.variants.find((v) => v.condition === 'default');
  return { planId: plans.id, weeks: found.weeks };
}

module.exports = { XP, LEVELS, levelForXp, progressToNextLevel, BADGES, evaluateBadges, SKILL_KEYS, computeProfile, pickPlanVariant };
