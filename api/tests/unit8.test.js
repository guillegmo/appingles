const test = require('node:test');
const assert = require('node:assert/strict');
const advancedStats = require('../services/advancedStats');
const entitlement = require('../services/entitlement');

// Store en memoria (mismo contrato que lib/store).
function fakeStore() {
  const cols = {};
  return {
    async setDoc(col, id, doc) {
      (cols[col] = cols[col] || {})[id] = { id, ...doc };
      return { ok: true };
    },
    async getDoc(col, id) {
      return (cols[col] || {})[id] || null;
    },
    async listDocs(col) {
      return Object.values(cols[col] || {});
    },
  };
}

const TODAY = '2026-08-16T12:00:00Z';

async function seed(store) {
  await store.setDoc('progress', 'u1', {
    completedDays: [1, 2, 3],
    practiceDays: ['2026-08-14', '2026-08-15', '2026-08-16'],
    totalXp: 120,
    exercisesCompleted: 5,
    speakingSessions: 2,
    streakFreezes: 1,
  });
  await store.setDoc('streaks', 'u1', { currentStreak: 3, longestStreak: 5 });
  await store.setDoc('badges', 'u1', { earned: ['first_day'] });
  await store.setDoc('profiles', 'u1', {
    profile: { level: 'A2', strongestSkill: 'speaking', needsImprovement: ['grammar'], averageScore: 70 },
  });
  await store.setDoc('vocabulary', 'u1', { items: [{ en: 'apple', es: 'manzana' }, { en: 'dog', es: 'perro' }] });

  await store.setDoc('exerciseAttempts', 'a1', { userId: 'u1', day: 1, correct: true, xpEarned: 5, at: '2026-08-16T10:00:00Z' });
  await store.setDoc('exerciseAttempts', 'a2', { userId: 'u1', day: 1, correct: false, xpEarned: 0, at: '2026-08-16T11:00:00Z' });
  await store.setDoc('exerciseAttempts', 'a3', { userId: 'u1', day: 2, correct: true, xpEarned: 5, at: '2026-08-15T09:00:00Z' });
  await store.setDoc('exerciseAttempts', 'a4', { userId: 'u1', day: 3, correct: true, xpEarned: 5, at: '2026-08-01T09:00:00Z' });

  await store.setDoc('pronunciationScores', 'p1', { userId: 'u1', target: 'I like coffee', score: 90, at: '2026-08-16T10:00:00Z' });
  await store.setDoc('pronunciationScores', 'p2', { userId: 'u1', target: 'Good morning', score: 70, at: '2026-08-15T10:00:00Z' });

  await store.setDoc('aiUsage', 'u1_2026-08-16', { userId: 'u1', date: '2026-08-16', tutor: { count: 2, tokens: 400, estimatedCost: 0.01 } });
  await store.setDoc('aiUsage', 'u1_2026-08-15', { userId: 'u1', date: '2026-08-15', tutor: { count: 3, tokens: 600, estimatedCost: 0.02 } });
}

test('AdvancedStats: shape general con datos sembrados', async () => {
  const store = fakeStore();
  await seed(store);
  const s = await advancedStats.advancedStats('u1', { today: TODAY, deps: { store } });

  assert.equal(s.period.days, 7);
  assert.equal(s.overview.totalXp, 120);
  assert.equal(s.overview.vocabularyCount, 2);
  assert.equal(s.overview.speakingSessions, 2);
  assert.equal(s.overview.streakFreezes, 1);
  assert.equal(s.overview.currentStreak, 3);
  assert.equal(s.overview.daysCompleted, 3);
});

test('AdvancedStats: precisión global y últimos 7 días', async () => {
  const store = fakeStore();
  await seed(store);
  const s = await advancedStats.advancedStats('u1', { today: TODAY, deps: { store } });

  // 4 intentos totales, 3 correctos -> 75%
  assert.equal(s.accuracy.overall.attempts, 4);
  assert.equal(s.accuracy.overall.accuracyPct, 75);
  // Últimos 7 días: 3 intentos (excluye el del 08-01), 2 correctos -> 67%
  assert.equal(s.accuracy.lastN.attempts, 3);
  assert.equal(s.accuracy.lastN.accuracyPct, 67);
});

test('AdvancedStats: serie diaria de 7 días con xp acumulado', async () => {
  const store = fakeStore();
  await seed(store);
  const s = await advancedStats.advancedStats('u1', { today: TODAY, deps: { store } });

  assert.equal(s.series.length, 7);
  const todayBucket = s.series.find((d) => d.date === '2026-08-16');
  assert.equal(todayBucket.attempts, 2);
  assert.equal(todayBucket.correct, 1);
  assert.equal(todayBucket.xp, 5);
  const yesterdayBucket = s.series.find((d) => d.date === '2026-08-15');
  assert.equal(yesterdayBucket.attempts, 1);
  // El intento del 08-01 queda fuera de la ventana de 7 días
  assert.equal(s.series.find((d) => d.date === '2026-08-01'), undefined);
});

test('AdvancedStats: pronóstico de pronunciación (promedio/mejor/recientes)', async () => {
  const store = fakeStore();
  await seed(store);
  const s = await advancedStats.advancedStats('u1', { today: TODAY, deps: { store } });

  assert.equal(s.pronunciation.attempts, 2);
  assert.equal(s.pronunciation.averageScore, 80);
  assert.equal(s.pronunciation.bestScore, 90);
  assert.equal(s.pronunciation.recent.length, 2);
  assert.equal(s.pronunciation.recent[0].target, 'I like coffee');
  assert.equal(s.pronunciation.phrases.length, 2);
  assert.equal(s.pronunciation.phrases[0].target, 'I like coffee');
  assert.equal(s.pronunciation.phrases[0].bestScore, 90);
  assert.equal(s.pronunciation.phrases[0].attempts, 1);
  assert.equal(s.pronunciation.phrases[1].bestScore, 70);
});

test('AdvancedStats: uso de IA suma sesiones/tokens y separa el de hoy', async () => {
  const store = fakeStore();
  await seed(store);
  const s = await advancedStats.advancedStats('u1', { today: TODAY, deps: { store } });

  assert.equal(s.ai.totalSessions, 5);
  assert.equal(s.ai.totalTokens, 1000);
  assert.equal(s.ai.usedToday, 2);
});

test('AdvancedStats: skills usa el perfil de la evaluación', async () => {
  const store = fakeStore();
  await seed(store);
  const s = await advancedStats.advancedStats('u1', { today: TODAY, deps: { store } });
  assert.equal(s.skills.level, 'A2');
  assert.equal(s.skills.strongestSkill, 'speaking');
  assert.deepEqual(s.skills.needsImprovement, ['grammar']);
});

test('Entitlement: Free no tiene analytics avanzados; Premium sí', () => {
  const free = entitlement.buildEntitlements({ status: 'free', plan: 'free' });
  assert.equal(free.canAccessAdvancedStats, false);
  const premium = entitlement.buildEntitlements({ status: 'active', plan: 'premium-annual' });
  assert.equal(premium.canAccessAdvancedStats, true);
});

test('AdvancedStats: datos vacíos no rompen (usuarios nuevos)', async () => {
  const store = fakeStore();
  const s = await advancedStats.advancedStats('nuevo', { today: TODAY, deps: { store } });
  assert.equal(s.accuracy.overall.accuracyPct, 0);
  assert.equal(s.overview.totalXp, 0);
  assert.equal(s.pronunciation.averageScore, 0);
  assert.equal(s.pronunciation.phrases.length, 0);
  assert.equal(s.series.length, 7);
  assert.equal(s.skills, null);
});