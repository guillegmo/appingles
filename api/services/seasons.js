// services/seasons.js
// Temporadas continuas post-21. Pura y testeable: define ventanas semanales
// y evalúa el progreso de retos a partir de métricas del usuario.

// Semana ISO: lunes es el primer día. Devuelve { key, start, end } con fechas YYYY-MM-DD.
function currentSeason(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7; // 1=Mon ... 7=Sun
  const start = new Date(d);
  start.setDate(d.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (x) => x.toISOString().slice(0, 10);
  const key = fmt(start);
  return { key, start: fmt(start), end: fmt(end) };
}

// Días de una ventana [start, end] (inclusive). Las métricas guardan fechas YYYY-MM-DD.
function inWindow(dateStr, season) {
  return dateStr >= season.start && dateStr <= season.end;
}

// Evalúa los retos de una temporada.
// stats: { practiceDays: string[], exerciseAttempts: [{at}], speakingSessions: [{at}], reviews: [{at}] }
function evaluateSeason(season, retos, stats) {
  const countDates = (arr, key) => arr.filter((e) => inWindow((e[key] || '').slice(0, 10), season)).length;

  const practiceDays = new Set(
    (stats.practiceDays || []).filter((d) => inWindow(d, season))
  ).size;

  const exercised = countDates(stats.exerciseAttempts || [], 'at');
  const spoke = countDates(stats.speakingSessions || [], 'at');
  const reviewed = countDates(stats.reviews || [], 'at');

  const metrics = {
    practiceDays,
    exercisesCompleted: exercised,
    speakingSessions: spoke,
    reviewsCompleted: reviewed,
  };

  return retos.map((reto) => ({
    ...reto,
    current: metrics[reto.metric] ?? 0,
    done: (metrics[reto.metric] ?? 0) >= reto.target,
    reward: reto.reward,
  }));
}

// Recompensa total de los retos completados (XP).
function totalReward(retos) {
  return retos.filter((r) => r.done).reduce((s, r) => s + r.reward, 0);
}

// Estado de una temporada para un usuario.
async function buildSeason({ season, retos, stats, claimedKey, claimed = {} }) {
  const evaluated = evaluateSeason(season, retos, stats);
  const reward = totalReward(evaluated);
  return {
    season,
    retos: evaluated,
    reward,
    rewardClaimed: claimed.total || 0,
    allDone: evaluated.every((r) => r.done),
    claimedKey,
  };
}

module.exports = { currentSeason, inWindow, evaluateSeason, totalReward, buildSeason };
