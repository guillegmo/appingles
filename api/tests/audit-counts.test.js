// tests/audit-counts.test.js
// Auditoría independiente de la capa de datos: instrumenta store.* y verifica
// con conteos reales que los flujos optimizados NO disparan lecturas
// innecesarias (listDocs sobre colecciones enteras, N+1, lecturas en caminos
// de rechazo). Usa el store real en modo file con usuarios temporales.

process.env.AUTH_MODE = 'dev';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const store = require('../lib/store');

const seasonsRouter = require('../routes/seasons');
const memoryRouter = require('../routes/memory');
const contentRouter = require('../routes/content');
const leaderboardRouter = require('../routes/leaderboard');
const tutorRouter = require('../routes/tutor');
const practiceRouter = require('../routes/practice');

const CHAMP = 'audit-champ2';
const LB_USER = 'audit-lb-a';
const AT_LIMIT = 'audit-limit';
const NON_CHAMP = 'audit-free2';
const TODAY = new Date().toISOString().slice(0, 10);

// ---- Instrumentación del store (los routes comparten el mismo objeto módulo) ----
const orig = {
  listDocs: store.listDocs,
  queryDocs: store.queryDocs,
  getDocs: store.getDocs,
  getDoc: store.getDoc,
};
const counters = { listDocs: [], queryDocs: [], getDocs: [], getDoc: [] };

function instrument() {
  store.listDocs = async (col) => { counters.listDocs.push(col); return orig.listDocs(col); };
  store.queryDocs = async (col, opts) => { counters.queryDocs.push({ col, opts }); return orig.queryDocs(col, opts); };
  store.getDocs = async (col, ids) => { counters.getDocs.push({ col, ids }); return orig.getDocs(col, ids); };
  store.getDoc = async (col, id) => { counters.getDoc.push(col); return orig.getDoc(col, id); };
}

function resetCounters() {
  counters.listDocs.length = 0;
  counters.queryDocs.length = 0;
  counters.getDocs.length = 0;
  counters.getDoc.length = 0;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/seasons', seasonsRouter);
  app.use('/api/memory', memoryRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/leaderboard', leaderboardRouter);
  app.use('/api/tutor', tutorRouter);
  app.use('/api/practice', practiceRouter);
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
        headers: { 'Content-Type': 'application/json', 'X-Dev-User': user, 'X-Session-Id': 'audit' },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, data: await res.json().catch(() => ({})) };
    });
  } finally {
    server.close();
  }
}

async function cleanup() {
  for (const [col, id] of [
    ['progress', CHAMP], ['progress', LB_USER], ['progress', NON_CHAMP],
    ['users', LB_USER], ['aiUsage', `${AT_LIMIT}_${TODAY}`],
    ['seasonClaims', `${CHAMP}_${new Date().getFullYear()}-s1`],
    ['seasonClaims', `${CHAMP}_${new Date().getFullYear()}-s2`],
    ['seasonClaims', `${CHAMP}_${new Date().getFullYear()}-s3`],
    ['seasonClaims', `${CHAMP}_${new Date().getFullYear()}-s4`],
  ]) {
    await store.deleteDoc(col, id);
  }
  const attempts = await orig.listDocs('exerciseAttempts');
  for (const a of attempts) if (a.userId === CHAMP) await store.deleteDoc('exerciseAttempts', a.id);
  const speaking = await orig.listDocs('speakingSessions');
  for (const s of speaking) if (s.userId === CHAMP) await store.deleteDoc('speakingSessions', s.id);
  const reviews = await orig.listDocs('reviewResults');
  for (const r of reviews) if (r.userId === CHAMP) await store.deleteDoc('reviewResults', r.id);
  const cards = await orig.listDocs('reviewCards');
  for (const c of cards) if (c.userId === CHAMP) await store.deleteDoc('reviewCards', c.id);
  const vocab = await orig.getDoc('vocabulary', CHAMP);
  if (vocab) await store.deleteDoc('vocabulary', CHAMP);
}

test.before(async () => {
  instrument();
  await cleanup();
  await store.setDoc('progress', CHAMP, { completedDays: [21], practiceDays: [TODAY], totalXp: 100, exercisesCompleted: 5, speakingSessions: 1 });
  await store.setDoc('progress', LB_USER, { totalXp: 500, practiceDays: [TODAY], completedDays: [1] });
  await store.setDoc('users', LB_USER, { name: 'Auditor' });
  await store.setDoc('progress', NON_CHAMP, { completedDays: [], practiceDays: [], totalXp: 0 });
  await store.setDoc('aiUsage', `${AT_LIMIT}_${TODAY}`, { userId: AT_LIMIT, date: TODAY, tutor: { count: 3, tokens: 0, estimatedCost: 0 } });
});

test.after(async () => {
  await cleanup();
  store.listDocs = orig.listDocs;
  store.queryDocs = orig.queryDocs;
  store.getDocs = orig.getDocs;
  store.getDoc = orig.getDoc;
});

test('Auditoría: cero listDocs y queries filtradas en seasons/current', async () => {
  await withServer(async (call) => {
    await call('GET', '/api/seasons/current', null, CHAMP); // warm-up (cache sub)
    resetCounters();

    const res = await call('GET', '/api/seasons/current', null, CHAMP);
    assert.equal(res.status, 200);

    assert.deepEqual(counters.listDocs, [], 'seasons NO debe usar listDocs (antes leía colecciones enteras)');
    assert.equal(counters.getDocs.length, 0);
    assert.equal(counters.queryDocs.length, 3, 'exactamente 3 queries filtradas');
    const cols = counters.queryDocs.map((q) => q.col).sort();
    assert.deepEqual(cols, ['exerciseAttempts', 'reviewResults', 'speakingSessions']);
    for (const q of counters.queryDocs) {
      assert.deepEqual(q.opts.filters, [{ field: 'userId', op: '==', value: CHAMP }]);
    }
    // Sin re-lectura de progress: auth(sessions) + progress + claim = 3 lecturas de doc.
    assert.deepEqual(counters.getDoc.slice(0, 3).sort(), ['progress', 'seasonClaims', 'sessions']);
    assert.ok(!counters.getDoc.includes('profiles'));
  });
});

test('Auditoría: leaderboard sin N+1 (1 getDocs, cero getDoc de users)', async () => {
  await withServer(async (call) => {
    await call('GET', '/api/leaderboard', null, CHAMP); // warm-up
    resetCounters();

    const res = await call('GET', '/api/leaderboard', null, CHAMP);
    assert.equal(res.status, 200);

    assert.equal(counters.getDocs.length, 1, 'nombres resueltos en UN solo lote');
    assert.equal(counters.getDocs[0].col, 'users');
    assert.ok(!counters.getDoc.includes('users'), 'cero getDoc N+1 sobre users');
    assert.equal(counters.queryDocs.filter((q) => q.col === 'progress').length, 1);
    assert.deepEqual(counters.listDocs, []);
  });
});

test('Auditoría: content/post21 filtra por status (sin listDocs)', async () => {
  await withServer(async (call) => {
    await call('GET', '/api/content/post21', null, CHAMP); // warm-up
    resetCounters();

    const res = await call('GET', '/api/content/post21', null, CHAMP);
    assert.equal(res.status, 200);
    assert.deepEqual(counters.listDocs, [], 'contentDrafts NO debe leerse entera');
    const q = counters.queryDocs.find((x) => x.col === 'contentDrafts');
    assert.ok(q, 'query filtrada sobre contentDrafts');
    assert.deepEqual(q.opts.filters, [{ field: 'status', op: '==', value: 'published' }]);
  });
});

test('Auditoría: memory/board filtra reviewCards del usuario (sin listDocs)', async () => {
  await withServer(async (call) => {
    await call('GET', '/api/memory/board', null, CHAMP); // warm-up
    resetCounters();

    const res = await call('GET', '/api/memory/board', null, CHAMP);
    assert.equal(res.status, 200);
    assert.deepEqual(counters.listDocs, [], 'reviewCards NO debe leerse entera');
    const q = counters.queryDocs.find((x) => x.col === 'reviewCards');
    assert.ok(q);
    assert.deepEqual(q.opts.filters, [{ field: 'userId', op: '==', value: CHAMP }]);
  });
});

test('Auditoría: 429 del tutor cuesta 1 sola lectura (sin historial ni perfil)', async () => {
  await withServer(async (call) => {
    await call('GET', '/api/tutor/usage', null, AT_LIMIT); // warm-up
    resetCounters();

    const res = await call('POST', '/api/tutor/message', { mode: 'conversation', message: 'hola' }, AT_LIMIT);
    assert.equal(res.status, 429);
    assert.deepEqual(res.data.error, 'ai_limit_reached');
    // Solo la lectura de sesión del middleware; la reserva transaccional decide
    // el 429 sin leer historial (conversations) ni perfil (profiles).
    assert.deepEqual(counters.getDoc, ['sessions'], '429 no debe leer conversations/profiles');
    assert.deepEqual(counters.listDocs, []);
  });
});

test('Auditoría: 403 de practice/today no lee profiles', async () => {
  await withServer(async (call) => {
    await call('GET', '/api/practice/today', null, NON_CHAMP); // warm-up
    resetCounters();

    const res = await call('GET', '/api/practice/today', null, NON_CHAMP);
    assert.equal(res.status, 403);
    assert.deepEqual(counters.getDoc.slice().sort(), ['progress', 'sessions'], '403 solo lee progress + sesión');
    assert.ok(!counters.getDoc.includes('profiles'));
  });
});
