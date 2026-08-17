const test = require('node:test');
const assert = require('node:assert/strict');
const scoring = require('../services/scoring');
const streak = require('../services/streak');
const entitlement = require('../services/entitlement');

test('XP: level progression', () => {
  assert.equal(scoring.levelForXp(0).key, 'beginner');
  assert.equal(scoring.levelForXp(800).key, 'elementary');
  assert.equal(scoring.levelForXp(2200).key, 'pre-intermediate');
  assert.equal(scoring.levelForXp(4500).key, 'intermediate');
});

test('XP: progress to next level', () => {
  const p = scoring.progressToNextLevel(400);
  assert.equal(p.current.key, 'beginner');
  assert.equal(p.next.key, 'elementary');
  assert.ok(p.pct > 0 && p.pct < 100);
});

test('Badges: first-day y streak', () => {
  const earned = scoring.evaluateBadges({ daysCompleted: 1, currentStreak: 3, speakingSessions: 0, exercisesCompleted: 0 });
  assert.ok(earned.includes('first-day'));
  assert.ok(earned.includes('streak-3'));
  assert.ok(!earned.includes('champion-21'));
});

test('Badges: champion-21', () => {
  const earned = scoring.evaluateBadges({ daysCompleted: 21, currentStreak: 21, speakingSessions: 1, exercisesCompleted: 50 });
  assert.ok(earned.includes('champion-21'));
  assert.ok(earned.includes('practice-master'));
});

test('Streak: actual + longest', () => {
  const today = new Date('2026-08-14T12:00:00Z');
  const keys = ['2026-08-12', '2026-08-13', '2026-08-14'];
  const s = streak.computeStreaks(keys, today);
  assert.equal(s.currentStreak, 3);
  assert.equal(s.longestStreak, 3);
  assert.equal(s.todayPracticed, true);
});

test('Streak: no practicó hoy aún, sigue contando desde ayer', () => {
  const today = new Date('2026-08-14T12:00:00Z');
  const keys = ['2026-08-12', '2026-08-13'];
  const s = streak.computeStreaks(keys, today);
  assert.equal(s.currentStreak, 2);
  assert.equal(s.todayPracticed, false);
});

test('Streak: racha rota', () => {
  const today = new Date('2026-08-14T12:00:00Z');
  const keys = ['2026-08-12', '2026-08-10'];
  const s = streak.computeStreaks(keys, today);
  assert.equal(s.currentStreak, 0);
  assert.equal(s.longestStreak, 1);
});

test('Entitlements: free accede a los 21 días (reto permanente), premium IA completo', () => {
  const free = entitlement.buildEntitlements({ status: 'free', plan: 'free' });
  assert.equal(free.canAccessDay(7), true);
  assert.equal(free.canAccessDay(21), true);
  assert.equal(free.aiMessagesPerDay, 3); // muestra de IA
  assert.equal(free.canUseRoleplay, false);
  assert.equal(free.canGenerateLessons, false);
  const premium = entitlement.buildEntitlements({ status: 'active', plan: 'premium' });
  assert.equal(premium.canAccessDay(21), true);
  assert.ok(premium.canUseRoleplay);
  assert.ok(premium.canGenerateLessons);
});

test('Entitlements: trialing cuenta como premium', () => {
  const t = entitlement.buildEntitlements({ status: 'trialing', plan: 'premium' });
  assert.equal(t.canAccessDay(21), true);
});

test('Assessment: perfil con debilidades', () => {
  const profile = scoring.computeProfile({ speaking: 40, listening: 70, vocabulary: 90, conversation: 55, grammar: 80, confidence: 50 });
  assert.equal(profile.strongestSkill, 'vocabulary');
  assert.ok(profile.needsImprovement.includes('speaking'));
  assert.ok(profile.averageScore >= 60);
});

test('Assessment: plan variant por debilidad', () => {
  const plans = {
    variants: [
      { condition: 'weakest: speaking', weeks: [{ week: 1, focus: 'Speaking confidence' }] },
      { condition: 'default', weeks: [{ week: 1, focus: 'X' }] },
    ],
  };
  const profile = { needsImprovement: ['speaking'] };
  const plan = scoring.pickPlanVariant(plans, profile);
  assert.equal(plan.weeks[0].focus, 'Speaking confidence');
});
