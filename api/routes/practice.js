// routes/practice.js
// Daily Practice post-21: misión diaria + completado (+XP).

const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const content = require('../lib/content');
const scoring = require('../services/scoring');
const recommendation = require('../services/recommendation');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /practice/today -> misión diaria (recomendación personalizada)
router.get('/today', async (req, res) => {
  const progress = (await store.getDoc('progress', req.user.id)) || { completedDays: [] };

  // Post-21: requiere haber completado el reto
  const champion = progress.completedDays.includes(21);
  if (!champion) return res.status(403).json({ error: 'post21_required', message: 'Completa el reto de 21 días para desbloquear Daily Practice.' });

  const profileDoc = await store.getDoc('profiles', req.user.id);
  const curriculum = content.getPost21('curriculum');

  const { mission, lesson } = recommendation.buildDailyPractice({
    profile: profileDoc?.profile || null,
    curriculum,
    progress,
  });

  const daily = progress.dailyPractice || {};
  const todayKey = new Date().toISOString().slice(0, 10);
  mission.done = Boolean(daily[todayKey]);

  res.json({ mission, lesson: lesson ? { id: lesson.id, title: lesson.title, skill: lesson.skill, situation: lesson.situation, topic: lesson.topic, vocabulary: lesson.vocabulary, phrases: lesson.phrases } : null });
});

// POST /practice/complete -> marcar práctica diaria completada (+XP)
router.post('/complete', async (req, res) => {
  const progress = (await store.getDoc('progress', req.user.id)) || { completedDays: [], practiceDays: [], dailyPractice: {}, totalXp: 0, exercisesCompleted: 0, speakingSessions: 0 };
  if (!progress.completedDays.includes(21)) return res.status(403).json({ error: 'post21_required' });

  const todayKey = new Date().toISOString().slice(0, 10);
  const alreadyDone = Boolean(progress.dailyPractice?.[todayKey]);

  if (!progress.practiceDays.includes(todayKey)) progress.practiceDays.push(todayKey);
  if (!alreadyDone) progress.totalXp += scoring.XP.challengeComplete;

  progress.dailyPractice = progress.dailyPractice || {};
  progress.dailyPractice[todayKey] = {
    topic: req.body?.topic || 'Conversación diaria',
    xp: alreadyDone ? 0 : scoring.XP.challengeComplete,
    completedAt: new Date().toISOString(),
  };

  await store.setDoc('progress', req.user.id, progress);
  res.json({ done: true, xpEarned: alreadyDone ? 0 : scoring.XP.challengeComplete, totalXp: progress.totalXp, date: todayKey });
});

module.exports = router;
