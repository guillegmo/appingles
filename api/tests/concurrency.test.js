// tests/concurrency.test.js
// Pruebas de concurrencia: verifica que peticiones simultáneas NO pierdan
// actualizaciones de XP/progreso/límites diarios. Usa el store real en modo
// file con usuarios temporales (conc-*) que se limpian al final.
//
// Antes de las transacciones, estas carreras perdían escrituras: dos intentos
// concurrentes leían el mismo progress y uno sobrescribía al otro.

process.env.AUTH_MODE = 'dev';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const store = require('../lib/store');
const scoring = require('../services/scoring');

const exercisesRouter = require('../routes/exercises');
const practiceRouter = require('../routes/practice');
const challengeRouter = require('../routes/challenge');
const memoryRouter = require('../routes/memory');
const vocabularyRouter = require('../routes/vocabulary');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/exercises', exercisesRouter);
  app.use('/api/practice', practiceRouter);
  app.use('/api/challenge', challengeRouter);
  app.use('/api/memory', memoryRouter);
  app.use('/api/vocabulary', vocabularyRouter);
  return app;
}

async function withServer(run) {
  const app = buildApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    return await run(async (method, path, body, user) => {
      const res = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Dev-User': user, 'X-Session-Id': 'conc' },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, data: await res.json().catch(() => ({})) };
    });
  } finally {
    server.close();
  }
}

const TODAY = new Date().toISOString().slice(0, 10);

async function cleanup(users) {
  const deletions = [];
  for (const u of users) {
    for (const [col, id] of [
      ['progress', u],
      ['streaks', u],
      ['badges', u],
      ['vocabulary', u],
      ['memoryStats', `${u}_stats`],
      ['aiUsage', `${u}_${TODAY}`],
      ['reviewCards', `${u}_day1_w0`],
      ['profiles', u],
    ]) {
      deletions.push(store.deleteDoc(col, id));
    }
  }
  await Promise.all(deletions);
}

test('Concurrencia: 10 intentos simultáneos conservan todo el XP y conteos', async () => {
  const U = 'conc-attempts';
  await cleanup([U]);
  try {
    await withServer(async (call) => {
      const responses = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          call('POST', '/api/exercises/attempt', { day: 1, exerciseId: `ex${i}`, type: 'quiz', answer: 'a', correct: true }, U),
        ),
      );
      assert.ok(responses.every((r) => r.status === 200), 'todas las peticiones deben ser 200');

      const progress = await store.getDoc('progress', U);
      assert.equal(progress.exercisesCompleted, 10, 'ningún intento debe perderse');
      assert.equal(progress.totalXp, 10 * scoring.XP.exerciseCorrect, 'ningún XP debe perderse');
      assert.ok(progress.practiceDays.includes(TODAY));
    });
  } finally {
    await cleanup([U]);
  }
});

test('Concurrencia: práctica diaria simultánea otorga XP una sola vez', async () => {
  const U = 'conc-practice';
  await cleanup([U]);
  try {
    await store.setDoc('progress', U, { completedDays: [21], practiceDays: [], totalXp: 0 });
    await withServer(async (call) => {
      const responses = await Promise.all(
        Array.from({ length: 5 }, () => call('POST', '/api/practice/complete', { topic: 't' }, U)),
      );
      assert.ok(responses.every((r) => r.status === 200));
      const withXp = responses.filter((r) => r.data.xpEarned > 0);
      assert.equal(withXp.length, 1, 'solo el primero paga XP');

      const progress = await store.getDoc('progress', U);
      assert.equal(progress.totalXp, scoring.XP.challengeComplete);
      assert.equal(Object.keys(progress.dailyPractice).length, 1);
    });
  } finally {
    await cleanup([U]);
  }
});

test('Concurrencia: completar el mismo día en paralelo paga XP una vez', async () => {
  const U = 'conc-day';
  await cleanup([U]);
  try {
    await withServer(async (call) => {
      const responses = await Promise.all(
        Array.from({ length: 4 }, () => call('POST', '/api/challenge/day/1/complete', {}, U)),
      );
      assert.ok(responses.every((r) => r.status === 200), JSON.stringify(responses.map((r) => r.data)));
      const withXp = responses.filter((r) => r.data.xpEarned > 0);
      assert.equal(withXp.length, 1);

      const progress = await store.getDoc('progress', U);
      assert.equal(progress.totalXp, withXp[0].data.xpEarned);
      assert.deepEqual(progress.completedDays.sort(), [1]);
    });
  } finally {
    await cleanup([U]);
  }
});

test('Concurrencia: partidas de memoria simultáneas no pierden estadísticas', async () => {
  const U = 'conc-memory';
  await cleanup([U]);
  try {
    await withServer(async (call) => {
      const responses = await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          call('POST', '/api/memory/result', { mode: 'free', size: '4x4', seed: `s${i}`, pairs: 8, moves: 14, timeMs: 25000 }, U),
        ),
      );
      assert.ok(responses.every((r) => r.status === 200));

      const stats = await store.getDoc('memoryStats', `${U}_stats`);
      assert.equal(stats.totalGames, 4, 'ninguna partida debe perderse');
      assert.equal(stats.bestTime, 25000);

      const progress = await store.getDoc('progress', U);
      const expectedXp = responses.reduce((sum, r) => sum + r.data.xpEarned, 0);
      assert.equal(progress.totalXp, expectedXp, 'el XP total debe coincidir con la suma de respuestas');
    });
  } finally {
    await cleanup([U]);
  }
});

test('Concurrencia: capturas de vocabulario simultáneas no pierden palabras', async () => {
  const U = 'conc-vocab';
  await cleanup([U]);
  try {
    await withServer(async (call) => {
      const words = Array.from({ length: 8 }, (_, i) => [{ en: `word${i}`, es: `palabra${i}` }]);
      const responses = await Promise.all(words.map((w) => call('POST', '/api/vocabulary/items', { words: w }, U)));
      assert.ok(responses.every((r) => r.status === 200));

      const doc = await store.getDoc('vocabulary', U);
      assert.equal(doc.items.length, 8, 'todas las palabras deben persistir');
    });
  } finally {
    await cleanup([U]);
  }
});

test('Concurrencia: revisiones simultáneas de la misma tarjeta no pierden historial ni duplican XP', async () => {
  const U = 'conc-review';
  await cleanup([U]);
  try {
    const cardId = `${U}_day1_w0`;
    await store.setDoc('reviewCards', cardId, {
      userId: U, key: 'day1_w0', day: 1, word: 'apple', es: 'manzana',
      repetitions: 0, qualityHistory: [], easeFactor: 2.5, dueDate: TODAY, dominant: false,
    });

    const reviewService = require('../services/reviewService');
    const results = await Promise.all(
      Array.from({ length: 3 }, () => reviewService.recordResult(U, cardId, 5)),
    );
    assert.ok(results.every((r) => r.ok));

    const card = await store.getDoc('reviewCards', cardId);
    assert.equal(card.qualityHistory.length, 3, 'las tres calificaciones deben registrarse');

    const progress = await store.getDoc('progress', U);
    assert.equal(progress.totalXp, 45, '15 XP por cada quality 5 (3 revisiones)');
  } finally {
    await cleanup([U]);
  }
});

// Regresión: progress solo se leía (const progress = quality >= 3 ? ... : null)
// cuando quality >= 3, pero el return final usaba progress.totalXp SIEMPRE —
// con quality 0/1/2 (calificar una tarjeta como "no la sabía"/"difícil", el
// caso más común al repasar) progress era null y explotaba con TypeError:
// 500 real en POST /review/:id/result. Cubre las 3 calidades bajas, con y
// sin progreso previo.
test('Review: calificar con quality < 3 no revienta y no otorga/pierde XP', async () => {
  const U = 'conc-review-low';
  await cleanup([U]);
  try {
    const cardId = `${U}_day1_w0`;
    await store.setDoc('reviewCards', cardId, {
      userId: U, key: 'day1_w0', day: 1, word: 'apple', es: 'manzana',
      repetitions: 0, qualityHistory: [], easeFactor: 2.5, dueDate: TODAY, dominant: false,
    });
    await store.setDoc('progress', U, { completedDays: [], practiceDays: [], totalXp: 20 });

    const reviewService = require('../services/reviewService');
    for (const quality of [0, 1, 2]) {
      const res = await reviewService.recordResult(U, cardId, quality);
      assert.equal(res.ok, true, `quality ${quality} no debe fallar`);
      assert.equal(res.xpEarned, 0, `quality ${quality} no otorga XP`);
      assert.equal(res.totalXp, 20, `quality ${quality} no debe alterar el XP existente`);
    }

    const progress = await store.getDoc('progress', U);
    assert.equal(progress.totalXp, 20, 'el XP no cambió en Firestore tampoco');
  } finally {
    await cleanup([U]);
  }
});

// Mismo caso pero SIN documento de progreso previo (usuario que nunca ganó
// XP) — normalizeProgress(null) debe devolver totalXp: 0, no explotar.
test('Review: quality < 3 sin progreso previo devuelve totalXp: 0', async () => {
  const U = 'conc-review-low-new';
  await cleanup([U]);
  try {
    const cardId = `${U}_day1_w0`;
    await store.setDoc('reviewCards', cardId, {
      userId: U, key: 'day1_w0', day: 1, word: 'apple', es: 'manzana',
      repetitions: 0, qualityHistory: [], easeFactor: 2.5, dueDate: TODAY, dominant: false,
    });

    const reviewService = require('../services/reviewService');
    const res = await reviewService.recordResult(U, cardId, 1);
    assert.equal(res.ok, true);
    assert.equal(res.totalXp, 0);
  } finally {
    await cleanup([U]);
  }
});
