// lib/progress.js
// Normalización del doc de progreso: si el doc existe pero le faltan campos
// (p.ej. completedDays borrado por el usuario), se completan con defaults.

function normalizeProgress(doc) {
  if (!doc) {
    return {
      completedDays: [],
      practiceDays: [],
      totalXp: 0,
      exercisesCompleted: 0,
      speakingSessions: 0,
      dailyPractice: {},
      streakFreezes: 0,
    };
  }
  return {
    ...doc,
    completedDays: Array.isArray(doc.completedDays) ? doc.completedDays : [],
    practiceDays: Array.isArray(doc.practiceDays) ? doc.practiceDays : [],
    totalXp: typeof doc.totalXp === 'number' ? doc.totalXp : 0,
    exercisesCompleted: typeof doc.exercisesCompleted === 'number' ? doc.exercisesCompleted : 0,
    speakingSessions: typeof doc.speakingSessions === 'number' ? doc.speakingSessions : 0,
    dailyPractice: doc.dailyPractice || {},
    streakFreezes: typeof doc.streakFreezes === 'number' ? doc.streakFreezes : 0,
  };
}

module.exports = { normalizeProgress };
