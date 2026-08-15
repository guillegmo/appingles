const test = require('node:test');
const assert = require('node:assert/strict');
const seasons = require('../services/seasons');

const NOW = new Date('2026-08-14T12:00:00Z'); // viernes 14/08/2026
const SEASON = { key: '2026-08-10', start: '2026-08-10', end: '2026-08-16' };

const RETOS = [
  { id: 'practice-days', metric: 'practiceDays', target: 4, reward: 40 },
  { id: 'exercise-accuracy', metric: 'exercisesCompleted', target: 30, reward: 40 },
  { id: 'speaking-minutes', metric: 'speakingSessions', target: 3, reward: 50 },
  { id: 'review-cards', metric: 'reviewsCompleted', target: 15, reward: 30 },
];

test('Seasons: currentSeason empieza en lunes', () => {
  const s = seasons.currentSeason(NOW);
  assert.equal(s.key, '2026-08-10');
  assert.equal(s.start, '2026-08-10');
  assert.equal(s.end, '2026-08-16');
});

test('Seasons: inWindow filtra por rango inclusive', () => {
  assert.equal(seasons.inWindow('2026-08-10', SEASON), true);
  assert.equal(seasons.inWindow('2026-08-16', SEASON), true);
  assert.equal(seasons.inWindow('2026-08-09', SEASON), false);
  assert.equal(seasons.inWindow('2026-08-17', SEASON), false);
});

test('Seasons: evaluateSeason cuenta métricas de la ventana', () => {
  const stats = {
    practiceDays: ['2026-08-10', '2026-08-11', '2026-08-09'], // 2 en ventana
    exerciseAttempts: [
      { at: '2026-08-10T10:00:00Z' },
      { at: '2026-08-09T10:00:00Z' }, // fuera
      { at: '2026-08-16T10:00:00Z' },
    ], // 2 en ventana
    speakingSessions: [{ at: '2026-08-12T10:00:00Z' }], // 1
    reviews: [{ at: '2026-08-15T10:00:00Z' }], // 1
  };
  const result = seasons.evaluateSeason(SEASON, RETOS, stats);
  assert.equal(result[0].current, 2);
  assert.equal(result[1].current, 2);
  assert.equal(result[2].current, 1);
  assert.equal(result[3].current, 1);
  assert.equal(result[0].done, false);
});

test('Seasons: evaluateSeason marca done y recompensa', () => {
  const stats = {
    practiceDays: ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13'],
    exerciseAttempts: Array.from({ length: 30 }, () => ({ at: '2026-08-10T10:00:00Z' })),
    speakingSessions: [],
    reviews: [],
  };
  const result = seasons.evaluateSeason(SEASON, RETOS, stats);
  assert.equal(result[0].done, true);
  assert.equal(result[1].done, true);
  assert.equal(seasons.totalReward(result), 80);
});

test('Seasons: buildSeason expone recompensa y estado', async () => {
  const stats = {
    practiceDays: ['2026-08-10', '2026-08-11'],
    exerciseAttempts: [],
    speakingSessions: [],
    reviews: [],
  };
  const state = await seasons.buildSeason({
    season: SEASON,
    retos: RETOS,
    stats,
    claimed: {},
  });
  assert.equal(state.reward, 0);
  assert.equal(state.rewardClaimed, 0);
  assert.equal(state.allDone, false);
  assert.ok(state.season.key);
});
