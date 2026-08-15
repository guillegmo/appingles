// routes/challenge.js
// Reto de 21 días: índice + día + marcado de progreso + assessment + plan.

const express = require('express');
const router = express.Router();
const content = require('../lib/content');
const store = require('../lib/store');
const scoring = require('../services/scoring');
const streak = require('../services/streak');
const entitlement = require('../services/entitlement');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /challenge  -> índice del reto con estado del usuario
router.get('/', async (req, res) => {
  const index = content.getChallengeIndex();
  if (!index) return res.status(404).json({ error: 'Contenido no encontrado' });

  const progress = await store.getDoc('progress', req.user.id);
  const completedDays = progress?.completedDays || [];
  const ent = entitlement.serializableEntitlements(req.subscription);

  const days = index.days.map((d) => ({
    ...d,
    locked: d.day > ent.maxChallengeDay,
    completed: completedDays.includes(d.day),
  }));

  res.json({
    challenge: index.title,
    days,
    entitlements: ent,
    onboardingCompleted: !!progress?.onboardingCompleted,
  });
});

// POST /challenge/onboarding -> guarda objetivo + nivel autoevaluado del usuario
// (se muestra solo una vez por usuario; nivel real se calcula de XP/progreso).
router.post('/onboarding', async (req, res) => {
  const { goal, level } = req.body || {};
  const progress = (await store.getDoc('progress', req.user.id)) || { completedDays: [], practiceDays: [], totalXp: 0, exercisesCompleted: 0, speakingSessions: 0 };
  progress.onboarding = {
    goal: goal || 'daily',
    level: typeof level === 'number' ? level : 0,
    completedAt: new Date().toISOString(),
  };
  progress.onboardingCompleted = true;
  await store.setDoc('progress', req.user.id, progress);
  res.json({ ok: true, onboardingCompleted: true });
});

// GET /challenge/day/:n  -> contenido de un día (si tiene entitlement)
router.get('/day/:n', async (req, res) => {
  const n = Number(req.params.n);
  const ent = entitlement.buildEntitlements(req.subscription);
  if (!ent.canAccessDay(n)) {
    return res.status(403).json({ error: 'premium_required', day: n, message: 'Este día requiere Premium.' });
  }
  const day = await content.getDayPublished(n);
  if (!day) return res.status(404).json({ error: 'Día no encontrado' });

  const progress = await store.getDoc('progress', req.user.id);
  const completedDays = progress?.completedDays || [];
  day.completed = completedDays.includes(n);

  res.json(day);
});

// POST /challenge/day/:n/complete -> marcar día completado, XP, streak, badges
router.post('/day/:n/complete', async (req, res) => {
  const n = Number(req.params.n);
  const ent = entitlement.buildEntitlements(req.subscription);
  if (!ent.canAccessDay(n)) return res.status(403).json({ error: 'premium_required' });

  const day = await content.getDayPublished(n);
  if (!day) return res.status(404).json({ error: 'Día no encontrado' });

  const todayKey = streak.toDayKey();
  const progress = (await store.getDoc('progress', req.user.id)) || { completedDays: [], practiceDays: [], totalXp: 0, exercisesCompleted: 0, speakingSessions: 0 };

  const alreadyDone = progress.completedDays.includes(n);
  if (!alreadyDone) progress.completedDays.push(n);
  if (!progress.practiceDays.includes(todayKey)) progress.practiceDays.push(todayKey);
  if (!alreadyDone) progress.totalXp += day.xpReward;

  const { currentStreak, longestStreak } = streak.computeStreaks(progress.practiceDays);
  const stats = {
    daysCompleted: streak.daysCompleted(progress.completedDays),
    currentStreak,
    speakingSessions: progress.speakingSessions,
    exercisesCompleted: progress.exercisesCompleted,
  };
  const badges = scoring.evaluateBadges(stats);

  await store.setDoc('progress', req.user.id, progress);
  await store.setDoc('streaks', req.user.id, { currentStreak, longestStreak, updatedAt: todayKey });
  await store.setDoc('badges', req.user.id, { earned: badges });

  const level = scoring.levelForXp(progress.totalXp);
  res.json({
    dayCompleted: n,
    xpEarned: alreadyDone ? 0 : day.xpReward,
    totalXp: progress.totalXp,
    currentStreak,
    longestStreak,
    badges,
    level: level.label,
    challengeComplete: progress.completedDays.includes(21),
  });
});

// GET /challenge/assessment  -> evaluación post-21
router.get('/assessment', async (req, res) => {
  const assessment = content.getPost21('assessment');
  if (!assessment) return res.status(404).json({ error: 'Assessment no encontrado' });
  res.json(assessment);
});

// POST /challenge/assessment/complete -> guarda scores, genera perfil + plan
router.post('/assessment/complete', async (req, res) => {
  const { scores } = req.body || {};
  const profile = scoring.computeProfile(scores || {});
  const plans = content.getPost21('plans');
  const plan = plans ? scoring.pickPlanVariant(plans, profile) : null;

  const data = { userId: req.user.id, profile, plan, completedAt: new Date().toISOString() };
  await store.setDoc('profiles', req.user.id, data);
  if (plan) await store.setDoc('plans', req.user.id, { plan, assignedAt: new Date().toISOString() });

  res.json(data);
});

// GET /progress -> resumen de progreso del usuario
router.get('/progress', async (req, res) => {
  const progress = (await store.getDoc('progress', req.user.id)) || { completedDays: [], practiceDays: [], totalXp: 0, exercisesCompleted: 0, speakingSessions: 0 };
  const streaks = (await store.getDoc('streaks', req.user.id)) || { currentStreak: 0, longestStreak: 0 };
  const badges = (await store.getDoc('badges', req.user.id)) || { earned: [] };
  const profile = await store.getDoc('profiles', req.user.id);

  const stats = {
    daysCompleted: streak.daysCompleted(progress.completedDays),
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    speakingSessions: progress.speakingSessions,
    exercisesCompleted: progress.exercisesCompleted,
  };

  const level = scoring.levelForXp(progress.totalXp);
  const levelProgress = scoring.progressToNextLevel(progress.totalXp);

  res.json({
    daysCompleted: stats.daysCompleted,
    completedDays: progress.completedDays,
    totalXp: progress.totalXp,
    level: level.label,
    levelProgress,
    streaks,
    badges: badges.earned,
    allBadges: scoring.BADGES,
    profile: profile ? profile.profile : null,
  });
});

module.exports = router;
