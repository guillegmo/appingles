// routes/exercises.js
// Ejercicios interactivos + registro de intentos + XP.

const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const scoring = require('../services/scoring');
const reviewService = require('../services/reviewService');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// POST /exercises/attempt
// body: { day, exerciseId, type, answer, correct }
// Registra el intento, otorga XP por acierto y actualiza contador de ejercicios.
router.post('/attempt', async (req, res) => {
  const { day, exerciseId, type, answer, correct } = req.body || {};
  if (!day || !exerciseId || typeof correct !== 'boolean') {
    return res.status(400).json({ error: 'day, exerciseId y correct son requeridos' });
  }

  const progress = (await store.getDoc('progress', req.user.id)) || { completedDays: [], practiceDays: [], totalXp: 0, exercisesCompleted: 0, speakingSessions: 0 };
  const todayKey = new Date().toISOString().slice(0, 10);
  if (!progress.practiceDays.includes(todayKey)) progress.practiceDays.push(todayKey);

  let xpEarned = 0;
  if (correct) {
    xpEarned = scoring.XP.exerciseCorrect;
    progress.totalXp += xpEarned;
  }
  progress.exercisesCompleted += 1;

  await store.setDoc('progress', req.user.id, progress);

  await store.setDoc('exerciseAttempts', `${req.user.id}_${day}_${exerciseId}`, {
    userId: req.user.id,
    day,
    exerciseId,
    type,
    answer,
    correct,
    xpEarned,
    at: new Date().toISOString(),
  });

  // Smart Review: un fallo crea/actualiza la tarjeta de repaso del día.
  if (!correct) {
    await reviewService.ensureCard(req.user.id, day).catch(() => {});
  }

  res.json({ correct, xpEarned, totalXp: progress.totalXp });
});

// POST /exercises/speaking
// Registra una sesión de speaking (V1: sin transcripción de IA).
router.post('/speaking', async (req, res) => {
  const { day } = req.body || {};
  const progress = (await store.getDoc('progress', req.user.id)) || { completedDays: [], practiceDays: [], totalXp: 0, exercisesCompleted: 0, speakingSessions: 0 };

  const todayKey = new Date().toISOString().slice(0, 10);
  if (!progress.practiceDays.includes(todayKey)) progress.practiceDays.push(todayKey);
  progress.speakingSessions += 1;
  progress.totalXp += scoring.XP.speakingSession;

  await store.setDoc('progress', req.user.id, progress);
  await store.setDoc('speakingSessions', `${req.user.id}_${todayKey}`, {
    userId: req.user.id,
    day: day || null,
    at: new Date().toISOString(),
  });
  res.json({ speakingSessions: progress.speakingSessions, xpEarned: scoring.XP.speakingSession, totalXp: progress.totalXp });
});

module.exports = router;
