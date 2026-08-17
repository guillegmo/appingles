const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeProgress } = require('../lib/progress');

test('normalizeProgress completa campos faltantes en doc existente', () => {
  const doc = {
    onboardingCompleted: true,
    practiceDays: ['2026-08-17'],
    totalXp: 610,
    exercisesCompleted: 28,
    speakingSessions: 20,
  };
  const p = normalizeProgress(doc);
  assert.deepEqual(p.completedDays, []);
  assert.equal(p.streakFreezes, 0);
  assert.deepEqual(p.dailyPractice, {});
  assert.equal(p.totalXp, 610);
});

test('normalizeProgress devuelve defaults si no hay doc', () => {
  const p = normalizeProgress(null);
  assert.deepEqual(p, {
    completedDays: [],
    practiceDays: [],
    totalXp: 0,
    exercisesCompleted: 0,
    speakingSessions: 0,
    dailyPractice: {},
    streakFreezes: 0,
  });
});

test('normalizeProgress respeta arrays existentes', () => {
  const p = normalizeProgress({
    completedDays: [1, 2, 21],
    practiceDays: ['2026-08-16'],
    totalXp: 300,
    exercisesCompleted: 10,
    speakingSessions: 2,
    dailyPractice: { '2026-08-17': { topic: 'x' } },
    streakFreezes: 1,
  });
  assert.deepEqual(p.completedDays, [1, 2, 21]);
  assert.equal(p.streakFreezes, 1);
  assert.equal(p.dailyPractice['2026-08-17'].topic, 'x');
});

test('normalizeProgress corrige tipos incorrectos', () => {
  const p = normalizeProgress({ completedDays: 'no-array', practiceDays: null, totalXp: 'abc' });
  assert.deepEqual(p.completedDays, []);
  assert.deepEqual(p.practiceDays, []);
  assert.equal(p.totalXp, 0);
});
