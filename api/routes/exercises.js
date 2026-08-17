// routes/exercises.js
// Ejercicios interactivos + registro de intentos + XP.

const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const { normalizeProgress } = require('../lib/progress');
const scoring = require('../services/scoring');
const reviewService = require('../services/reviewService');
const pronunciation = require('../services/pronunciation');
const entitlement = require('../services/entitlement');
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

  const progress = normalizeProgress(await store.getDoc('progress', req.user.id));
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
  const progress = normalizeProgress(await store.getDoc('progress', req.user.id));

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

// POST /exercises/pronunciation
// body: { transcript, target, day? }
// Premium IA: puntaje de pronunciación comparando la transcripción con la frase.
router.post('/pronunciation', async (req, res) => {
  const ent = entitlement.buildEntitlements(req.subscription);
  if (!ent.canScorePronunciation) {
    return res.status(403).json({ error: 'premium_required', message: 'El puntaje de pronunciación es parte de Premium IA.' });
  }
  const { transcript, target, day } = req.body || {};
  if (!target || !transcript) {
    return res.status(400).json({ error: 'transcript y target son requeridos' });
  }

  const result = pronunciation.scorePronunciation({ transcript, target });
  await store.setDoc('pronunciationScores', `${req.user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, {
    userId: req.user.id,
    day: day || null,
    target,
    transcript,
    ...result,
    at: new Date().toISOString(),
  });

  res.json(result);
});

module.exports = router;
