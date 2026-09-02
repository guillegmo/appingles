// tests/tutor-limits.test.js
// Límites del tutor IA y concurrencia OBLIGATORIA del modelo freemium (V8: Premium 30/día):
//  - FREE 2/3 + 2 requests simultáneos        -> exactamente 1 aceptada -> 3/3
//  - PREMIUM 29/30 + 3 requests simultáneos   -> exactamente 1 aceptada -> 30/30
//  - PREMIUM 30/30 + 5 requests               -> 0 aceptadas (todas 429)
//  - Doble clic / reintento con mismo requestId -> 1 solo mensaje consumido
//  - Mensaje demasiado largo                  -> 400 message_too_long
//  - Rate limit anti-spam                     -> excedido => 429 rate_limited
//
// Usa el store real en modo file (transacciones serializadas con mutex) y la
// IA en modo mock (sin GROQ_API_KEY), con usuarios temporales tl-*.

process.env.AUTH_MODE = 'dev';
process.env.TUTOR_RATE_PER_MIN = '10'; // para poder probar el limiter rápido

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const store = require('../lib/store');

const tutorRouter = require('../routes/tutor');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/tutor', tutorRouter);
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
        headers: { 'Content-Type': 'application/json', 'X-Dev-User': user, 'X-Session-Id': 'tl' },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, data: await res.json().catch(() => ({})) };
    });
  } finally {
    server.close();
  }
}

const TODAY = new Date().toISOString().slice(0, 10);

function subscriptionDoc(plan) {
  return plan === 'premium'
    ? { status: 'active', plan: 'premium-monthly', updatedAt: new Date().toISOString() }
    : { status: 'free', plan: 'free', updatedAt: new Date().toISOString() };
}

async function seedUsed(userId, plan, used) {
  await store.setDoc('subscriptions', userId, subscriptionDoc(plan));
  if (used > 0) {
    await store.setDoc('aiUsage', `${userId}_${TODAY}`, {
      userId,
      date: TODAY,
      tutor: { count: used, tokens: 100 * used, inputTokens: 70 * used, outputTokens: 30 * used, estimatedCost: 0 },
    });
  }
}

async function usedCount(userId) {
  const doc = await store.getDoc('aiUsage', `${userId}_${TODAY}`);
  return doc?.tutor?.count ?? 0;
}

async function cleanup(users, requestIds = []) {
  const deletions = [];
  for (const u of users) {
    for (const [col, id] of [
      ['subscriptions', u],
      ['aiUsage', `${u}_${TODAY}`],
      ['profiles', u],
      ['conversations', `${u}_conversation`],
      ['conversations', `${u}_stuck`],
      ...requestIds.map((r) => ['aiRequests', `${u}_${r}`]),
    ]) {
      deletions.push(store.deleteDoc(col, id));
    }
  }
  await Promise.all(deletions);
}

test('FREE 2/3: dos requests simultáneos aceptan exactamente uno -> 3/3', async () => {
  const U = 'tl-free';
  await cleanup([U]);
  try {
    await seedUsed(U, 'free', 2);
    await withServer(async (call) => {
      const responses = await Promise.all(
        Array.from({ length: 2 }, (_, i) =>
          call('POST', '/api/tutor/message', { mode: 'conversation', message: `hello ${i}` }, U),
        ),
      );
      const ok = responses.filter((r) => r.status === 200);
      const limited = responses.filter((r) => r.status === 429);
      assert.equal(ok.length, 1, 'exactamente una petición debe ser aceptada');
      assert.equal(limited.length, 1, 'la otra debe recibir 429');
      assert.equal(limited[0].data.error, 'ai_limit_reached');

      assert.equal(await usedCount(U), 3, 'estado final 3/3 (nunca 4/3)');
      assert.equal(ok[0].data.used, 3);
      assert.equal(ok[0].data.limit, 3);
    });
  } finally {
    await cleanup([U]);
  }
});

test('PREMIUM 29/30: tres requests simultáneos aceptan exactamente uno -> 30/30', async () => {
  const U = 'tl-premium';
  await cleanup([U]);
  try {
    await seedUsed(U, 'premium', 29);
    await withServer(async (call) => {
      const responses = await Promise.all(
        Array.from({ length: 3 }, (_, i) =>
          call('POST', '/api/tutor/message', { mode: 'conversation', message: `hey ${i}` }, U),
        ),
      );
      const ok = responses.filter((r) => r.status === 200);
      const limited = responses.filter((r) => r.status === 429);
      assert.equal(ok.length, 1, 'solo una de las tres puede entrar');
      assert.equal(limited.length, 2);
      assert.equal(await usedCount(U), 30, 'estado final 30/30 (nunca 31/30)');
      assert.equal(ok[0].data.used, 30);
      assert.equal(ok[0].data.limit, 30);
    });
  } finally {
    await cleanup([U]);
  }
});

test('PREMIUM 30/30: cinco requests simultáneos -> 0 aceptadas', async () => {
  const U = 'tl-capped';
  await cleanup([U]);
  try {
    await seedUsed(U, 'premium', 30);
    await withServer(async (call) => {
      const responses = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          call('POST', '/api/tutor/message', { mode: 'conversation', message: `more ${i}` }, U),
        ),
      );
      assert.ok(responses.every((r) => r.status === 429), 'ninguna debe pasar el tope');
      assert.ok(responses.every((r) => r.data.error === 'ai_limit_reached'));
      assert.equal(await usedCount(U), 30, 'el contador no cambia');
    });
  } finally {
    await cleanup([U]);
  }
});

test('Idempotencia: reenvío con el mismo requestId consume UN solo mensaje', async () => {
  const U = 'tl-idem';
  const RID = 'idem-test-key-01';
  await cleanup([U], [RID]);
  try {
    await seedUsed(U, 'free', 0);
    await withServer(async (call) => {
      const first = await call('POST', '/api/tutor/message', { mode: 'conversation', message: 'Hello', requestId: RID }, U);
      assert.equal(first.status, 200);
      assert.ok(!first.data.duplicate);

      // Reintento (doble clic / retry de red): misma clave -> misma respuesta,
      // sin consumir otro mensaje.
      const second = await call('POST', '/api/tutor/message', { mode: 'conversation', message: 'Hello', requestId: RID }, U);
      assert.equal(second.status, 200);
      assert.equal(second.data.duplicate, true);
      assert.equal(second.data.reply, first.data.reply, 'misma respuesta cacheada');
      assert.equal(second.data.used, first.data.used, 'mismo contador');

      assert.equal(await usedCount(U), 1, 'un mensaje, no dos');

      // Dos peticiones CONCURRENTES con la misma clave: solo una procesa.
      U2: {
        const U2 = 'tl-idem-conc';
        const R2 = 'idem-conc-key-001';
        try {
          await seedUsed(U2, 'free', 0);
          const pair = await Promise.all(
            Array.from({ length: 2 }, () =>
              call('POST', '/api/tutor/message', { mode: 'conversation', message: 'Hi there', requestId: R2 }, U2),
            ),
          );
          const okPair = pair.filter((r) => r.status === 200);
          assert.equal(okPair.length, 2, 'ambas reciben respuesta (una real, una duplicada)');
          const uniqueReplies = new Set(okPair.map((r) => r.data.reply));
          assert.equal(uniqueReplies.size, 1, 'la misma respuesta para ambas');
          assert.ok(okPair.some((r) => r.data.duplicate === true), 'una viene marcada como duplicada');
          assert.equal(await usedCount(U2), 1, 'contador consistente entre pestañas/dispositivos');
        } finally {
          await cleanup([U2], [R2]);
        }
      }
    });
  } finally {
    await cleanup([U], [RID]);
  }
});

test('Mensaje demasiado largo -> 400 sin consumir cupo', async () => {
  const U = 'tl-long';
  await cleanup([U]);
  try {
    await seedUsed(U, 'free', 0);
    await withServer(async (call) => {
      const r = await call('POST', '/api/tutor/message', { mode: 'conversation', message: 'a'.repeat(2500) }, U);
      assert.equal(r.status, 400);
      assert.equal(r.data.error, 'message_too_long');
      assert.equal(await usedCount(U), 0, 'no consume mensajes');
    });
  } finally {
    await cleanup([U]);
  }
});

test('Rate limit anti-spam: exceder TUTOR_RATE_PER_MIN -> 429 rate_limited', async () => {
  const U = 'tl-spam';
  await cleanup([U]);
  try {
    await seedUsed(U, 'premium', 0);
    await withServer(async (call) => {
      // TUTOR_RATE_PER_MIN=10 en este proceso: los primeros 10 pasan, el 11 no.
      const statuses = [];
      for (let i = 0; i < 11; i++) {
        const r = await call('POST', '/api/tutor/message', { mode: 'conversation', message: `spam ${i}` }, U);
        statuses.push(r);
      }
      assert.equal(statuses.filter((r) => r.status === 200).length, 10, 'los 10 primeros pasan');
      assert.equal(statuses[10].status, 429);
      assert.equal(statuses[10].data.error, 'rate_limited', 'bloquea por ritmo, no por cupo diario');
      assert.equal(await usedCount(U), 10);
    });
  } finally {
    await cleanup([U]);
  }
});
