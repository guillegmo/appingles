const test = require('node:test');
const assert = require('node:assert/strict');
const pronunciation = require('../services/pronunciation');
const streak = require('../services/streak');

test('Pronunciación: transcripción correcta -> score alto', () => {
  const r = pronunciation.scorePronunciation({ transcript: 'I like coffee', target: 'I like coffee' });
  assert.equal(r.score, 100);
  assert.deepEqual(r.matched, ['i', 'like', 'coffee']);
  assert.equal(r.totalWords, 3);
});

test('Pronunciación: cobertura parcial castiga el score', () => {
  const r = pronunciation.scorePronunciation({ transcript: 'I like', target: 'I like coffee' });
  assert.ok(r.score > 0 && r.score < 100);
  assert.deepEqual(r.matched, ['i', 'like']);
});

test('Pronunciación: sin coincidencias -> score bajo', () => {
  const r = pronunciation.scorePronunciation({ transcript: 'nothing matches here', target: 'good morning' });
  assert.ok(r.score < 50);
});

test('Pronunciación: target vacío -> score 0', () => {
  const r = pronunciation.scorePronunciation({ transcript: 'hola', target: '' });
  assert.equal(r.score, 0);
});

test('Pronunciación: normaliza acentos/puntuación', () => {
  assert.equal(pronunciation.normalize("I'm fine, thanks!"), "i'm fine thanks");
});

test('Streak freeze: puentea un hueco de un día si hay freeze', () => {
  const today = new Date('2026-08-14T12:00:00Z');
  // practicó el 12 y hoy 14 (falló el 13)
  const keys = ['2026-08-12', '2026-08-14'];
  const r = streak.applyStreakFreeze(keys, today, 1);
  assert.equal(r.usedFreeze, true);
  const { currentStreak } = streak.computeStreaks(r.keys, today);
  assert.equal(currentStreak, 3);
});

test('Streak freeze: sin freeze no se puentea', () => {
  const today = new Date('2026-08-14T12:00:00Z');
  const keys = ['2026-08-12', '2026-08-14'];
  const r = streak.applyStreakFreeze(keys, today, 0);
  assert.equal(r.usedFreeze, false);
  const { currentStreak } = streak.computeStreaks(r.keys, today);
  assert.equal(currentStreak, 1);
});

test('Streak freeze: hueco de 2+ días no se puentea', () => {
  const today = new Date('2026-08-14T12:00:00Z');
  const keys = ['2026-08-11', '2026-08-14'];
  const r = streak.applyStreakFreeze(keys, today, 1);
  assert.equal(r.usedFreeze, false);
});

test('Streak freeze: practicó ayer, no gasta freeze', () => {
  const today = new Date('2026-08-14T12:00:00Z');
  const keys = ['2026-08-13'];
  const r = streak.applyStreakFreeze(keys, today, 1);
  assert.equal(r.usedFreeze, false);
});