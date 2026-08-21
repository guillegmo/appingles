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
// La actualización de progreso es transaccional: dos intentos simultáneos no
// pierden XP ni conteos (read->modify->write atómico).
router.post('/attempt', async (req, res) => {
  const { day, exerciseId, type, answer, correct } = req.body || {};
  if (!day || !exerciseId || typeof correct !== 'boolean') {
    return res.status(400).json({ error: 'day, exerciseId y correct son requeridos' });
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const xpEarned = correct ? scoring.XP.exerciseCorrect : 0;

  const totalXp = await store.runTransaction(async (tx) => {
    const progress = normalizeProgress(await tx.get('progress', req.user.id));
    if (!progress.practiceDays.includes(todayKey)) progress.practiceDays.push(todayKey);
    progress.totalXp += xpEarned;
    progress.exercisesCompleted += 1;
    tx.set('progress', req.user.id, progress);
    return progress.totalXp;
  });

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

  // Smart Review: un fallo crea/actualiza las tarjetas de repaso del día.
  if (!correct) {
    await reviewService.ensureCards(req.user.id, day).catch(() => {});
  }

  res.json({ correct, xpEarned, totalXp });
});

// POST /exercises/speaking
// Registra una sesión de speaking (V1: sin transcripción de IA).
router.post('/speaking', async (req, res) => {
  const { day } = req.body || {};
  const todayKey = new Date().toISOString().slice(0, 10);

  const result = await store.runTransaction(async (tx) => {
    const progress = normalizeProgress(await tx.get('progress', req.user.id));
    if (!progress.practiceDays.includes(todayKey)) progress.practiceDays.push(todayKey);
    progress.speakingSessions += 1;
    progress.totalXp += scoring.XP.speakingSession;
    tx.set('progress', req.user.id, progress);
    return { speakingSessions: progress.speakingSessions, totalXp: progress.totalXp };
  });

  await store.setDoc('speakingSessions', `${req.user.id}_${todayKey}`, {
    userId: req.user.id,
    day: day || null,
    at: new Date().toISOString(),
  });
  res.json({ speakingSessions: result.speakingSessions, xpEarned: scoring.XP.speakingSession, totalXp: result.totalXp });
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
