// tests/smoke-e2e.js
// Smoke test de integración: recorre TODOS los endpoints de la API contra una
// instancia en AUTH_MODE=dev + STORE_MODE=file (aislada, sin datos reales).
//
// Uso:
//   1) Levanta la instancia aislada:
//      $env:PORT=3010; $env:STORE_MODE='file'; $env:AUTH_MODE='dev'; node server.js
//   2) node tests/smoke-e2e.js
//
// Los resultados se imprimen como tabla; exit code 0 si todo pasa.

require('dotenv').config();
process.env.STORE_MODE = 'file'; // forzar store local antes de cargar lib/store

const store = require('../lib/store');
const aiUsage = require('../services/aiUsage');
const seasons = require('../services/seasons');

const BASE = process.env.SMOKE_BASE || 'http://localhost:3010/api';
const WEBHOOK_BASE = BASE.replace('/api', '/webhooks');

const results = [];
let pass = 0;
let fail = 0;

async function call(method, path, { user, body, headers = {} } = {}) {
  const h = { 'Content-Type': 'application/json', ...headers };
  if (user) h['X-Dev-User'] = user;
  const res = await fetch(BASE + path, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// Webhooks van montados en /webhooks (fuera de /api).
async function callWebhook(body) {
  const res = await fetch(WEBHOOK_BASE + '/hotmart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function check(name, expected, actualStatus, extra = '') {
  const ok = Array.isArray(expected) ? expected.includes(actualStatus) : actualStatus === expected;
  if (ok) pass++;
  else fail++;
  results.push({ ok: ok ? 'PASS' : 'FAIL', name, expected: JSON.stringify(expected), status: actualStatus, extra });
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const run = Date.now().toString(36);

  // ---- usuarios de prueba ----
  const FREE = 'qa-free';
  const PREMIUM = 'qa-premium';
  const CHAMP = 'qa-champ';
  const LIMIT_FREE = 'qa-limit-free';
  const LIMIT_PREMIUM = 'qa-limit-premium';
  const WEB = 'qa-webhook';

  // ============ AUTH / SESIÓN ============
  let r = await call('POST', '/auth/session', { user: FREE, body: { sessionId: 'smoke-1', name: 'QA Free' } });
  check('POST /auth/session', 200, r.status);

  // ============ CHALLENGE (reto 21) ============
  r = await call('GET', '/challenge', { user: FREE });
  check('GET /challenge', 200, r.status, `days=${r.data?.days?.length ?? '?'}`);
  check('GET /challenge → 21 días', 21, r.data?.days?.length ?? -1);
  check('GET /challenge → free sin generate', false, r.data?.entitlements?.canGenerateLessons);
  check('GET /challenge → free sin pronunciation', false, r.data?.entitlements?.canScorePronunciation);
  check('GET /challenge → free accede a 21 días', true, r.data?.days?.every((d) => !d.locked));

  r = await call('POST', '/challenge/onboarding', { user: FREE, body: { goal: 'travel', level: 2 } });
  check('POST /challenge/onboarding', 200, r.status);

  r = await call('GET', '/challenge/day/1', { user: FREE });
  check('GET /challenge/day/1', 200, r.status, `vocab=${r.data?.vocabulary?.length ?? '?'}`);

  r = await call('POST', '/challenge/day/1/complete', { user: FREE, body: {} });
  check('POST /challenge/day/1/complete', 200, r.status, `xp=${r.data?.xpEarned} streak=${r.data?.currentStreak}`);

  r = await call('POST', '/exercises/attempt', { user: FREE, body: { day: 1, exerciseId: 'ex1', type: 'quiz', answer: 'a', correct: true } });
  check('POST /exercises/attempt (acierto)', 200, r.status, `xp=${r.data?.xpEarned}`);

  r = await call('POST', '/exercises/attempt', { user: FREE, body: { day: 1, exerciseId: 'ex2', type: 'quiz', answer: 'b', correct: false } });
  check('POST /exercises/attempt (fallo)', 200, r.status);

  r = await call('POST', '/exercises/speaking', { user: FREE, body: { day: 1 } });
  check('POST /exercises/speaking', 200, r.status, `sessions=${r.data?.speakingSessions}`);

  r = await call('GET', '/challenge/progress', { user: FREE });
  check('GET /challenge/progress', 200, r.status, `days=${r.data?.daysCompleted} level=${r.data?.level}`);
  check('GET /challenge/progress → streakFreezes num', true, typeof r.data?.streakFreezes === 'number');

  // ============ GATES FREE (403 premium_required) ============
  r = await call('POST', '/exercises/pronunciation', { user: FREE, body: { transcript: 'hello', target: 'hello' } });
  check('POST /exercises/pronunciation (free→403)', 403, r.status, r.data?.error);

  r = await call('GET', '/content/post21', { user: FREE });
  check('GET /content/post21 (free sin día21→403)', 403, r.status, r.data?.error);

  r = await call('POST', '/content/post21/generate', { user: FREE, body: { skill: 'conversation', situation: 'social', topic: 'coffee' } });
  check('POST /content/post21/generate (free→403)', 403, r.status, r.data?.error);

  r = await call('GET', '/vocabulary', { user: FREE });
  check('GET /vocabulary (free→403)', 403, r.status, r.data?.error);

  r = await call('GET', '/analytics/advanced', { user: FREE });
  check('GET /analytics/advanced (free→403)', 403, r.status, r.data?.error);

  // ============ SUBSCRIPTION ============
  r = await call('GET', '/subscription/status', { user: FREE });
  check('GET /subscription/status (free)', 200, r.status, `plan=${r.data?.subscription?.status}`);
  check('GET /subscription/status → plan free', 'free', r.data?.subscription?.status);

  r = await call('GET', '/subscription/plans', { user: FREE });
  check('GET /subscription/plans', 200, r.status, `plans=${r.data?.plans?.length ?? '?'}`);
  check('GET /subscription/plans → monthly 15', 15, r.data?.plans?.find?.((p) => p.id === 'monthly')?.price);

  r = await call('GET', '/subscription/checkout?plan=monthly', { user: FREE });
  check('GET /subscription/checkout (dev)', 200, r.status, `dev=${r.data?.dev} url=${r.data?.url ?? 'null'}`);

  r = await call('POST', '/subscription/cancel', { user: FREE, body: {} });
  check('POST /subscription/cancel (sin suscripción→400)', 400, r.status, r.data?.error);

  r = await call('POST', '/subscription/activate', { user: PREMIUM, body: { plan: 'premium', trialDays: 7 } });
  check('POST /subscription/activate (dev trial)', 200, r.status, `status=${r.data?.subscription?.status}`);
  check('POST /subscription/activate → entitlements premium', true, r.data?.entitlements?.canGenerateLessons);

  r = await call('GET', '/subscription/status', { user: PREMIUM });
  check('GET /subscription/status (premium)', 200, r.status, `plan=${r.data?.subscription?.plan}`);

  r = await call('POST', '/subscription/cancel', { user: PREMIUM, body: {} });
  check('POST /subscription/cancel (activa→200)', 200, r.status, `status=${r.data?.subscription?.status}`);
  check('POST /subscription/cancel → canceled', 'canceled', r.data?.subscription?.status);
  check('POST /subscription/cancel → entitlements free', false, r.data?.entitlements?.canGenerateLessons);

  r = await call('POST', '/subscription/cancel', { user: PREMIUM, body: {} });
  check('POST /subscription/cancel (repetida→400)', 400, r.status, r.data?.error);

  // Re-activar para el resto de pruebas premium.
  r = await call('POST', '/subscription/activate', { user: PREMIUM, body: { plan: 'premium', trialDays: 7 } });
  check('POST /subscription/activate (2º)', 200, r.status);

  // ============ WEBHOOK HOTMART (dev) ============
  const purchaseApproved = {
    event: 'PURCHASE_APPROVED',
    id: `wh-${run}-001`,
    data: {
      subscriber: { buyer: { email: 'qa-webhook@test.io' } },
      product: { id: 'prod-m', name: 'AppIngles Mensual' },
      purchase: { recurrency_number: 1, status: 'approved', transaction: `wh-${run}-001` },
      subscription: { status: 'active' },
    },
  };
  r = await callWebhook({ ...purchaseApproved, devUserId: WEB });
  check('POST /webhooks/hotmart PURCHASE_APPROVED', 200, r.status, `applied=${r.data?.applied} plan=${r.data?.subscription?.plan}`);

  r = await call('GET', '/subscription/status', { user: WEB });
  check('Webhook → suscripción activa premium-monthly', 'active', r.data?.subscription?.status, r.data?.subscription?.plan);
  check('Webhook → plan premium-monthly', 'premium-monthly', r.data?.subscription?.plan);

  r = await callWebhook({ ...purchaseApproved, devUserId: WEB });
  check('POST /webhooks/hotmart (idempotente)', 200, r.status, `applied=${r.data?.applied} reason=${r.data?.reason ?? ''}`);

  const subscriptionCreated = {
    event: 'START_SUBSCRIPTION_CREATION',
    id: `wh-${run}-ignored`,
    data: {
      subscriber: { buyer: { email: 'qa-webhook@test.io' } },
      product: { id: 'prod-m', name: 'AppIngles Mensual' },
      subscription: { status: 'started' },
    },
  };
  r = await callWebhook({ ...subscriptionCreated, devUserId: WEB });
  check('POST /webhooks/hotmart START_SUBSCRIPTION_CREATION → ignorado', true, r.data?.ignored === true, r.data?.event);

  const cancelledEvent = {
    event: 'PURCHASE_CANCELED',
    id: `wh-${run}-002`,
    data: {
      subscriber: { buyer: { email: 'qa-webhook@test.io' } },
      product: { id: 'prod-m', name: 'AppIngles Mensual' },
      purchase: { status: 'canceled', transaction: `wh-${run}-002` },
    },
  };
  r = await callWebhook({ ...cancelledEvent, devUserId: WEB });
  check('POST /webhooks/hotmart PURCHASE_CANCELED', 200, r.status, `status=${r.data?.subscription?.status}`);

  // ============ PRONUNCIACIÓN (premium) ============
  r = await call('POST', '/exercises/pronunciation', { user: PREMIUM, body: { transcript: 'hello world', target: 'hello world', day: 21 } });
  check('POST /exercises/pronunciation (premium→200)', 200, r.status, `score=${r.data?.score}`);
  check('POST /exercises/pronunciation → score 0-100', true, typeof r.data?.score === 'number' && r.data?.score >= 0 && r.data?.score <= 100);

  r = await call('POST', '/exercises/pronunciation', { user: PREMIUM, body: { transcript: '', target: 'x' } });
  check('POST /exercises/pronunciation (sin transcript→400)', 400, r.status);

  // ============ CONTENT POST-21 (champ + premium) ============
  await store.setDoc('progress', CHAMP, {
    completedDays: [21],
    practiceDays: [],
    totalXp: 0,
    exercisesCompleted: 0,
    speakingSessions: 0,
  });

  r = await call('GET', '/content/post21', { user: CHAMP });
  check('GET /content/post21 (champ→200)', 200, r.status, `lessons=${r.data?.lessons?.length ?? '?'}`);
  check('GET /content/post21 → skills', true, Array.isArray(r.data?.skills));

  const lessonId = r.data?.lessons?.[0]?.id;
  r = await call('GET', `/content/post21/${lessonId}`, { user: CHAMP });
  check('GET /content/post21/:id', 200, r.status, r.data?.title);
  check('GET /content/post21/:id → vocabulary', true, Array.isArray(r.data?.vocabulary));

  r = await call('GET', '/content/post21/nonexistent-xyz', { user: CHAMP });
  check('GET /content/post21/:id (404)', 404, r.status);

  r = await call('POST', '/content/post21/generate', { user: PREMIUM, body: { skill: 'conversation', situation: 'social', topic: 'ordenar un cafe' } });
  check('POST /content/post21/generate (premium→200)', 200, r.status, `id=${r.data?.id ?? '?'} mock=${r.data?.lesson?.generated_by ?? '?'}`);

  // ============ PRACTICE / DAILY ============
  r = await call('GET', '/practice/today', { user: CHAMP });
  check('GET /practice/today (champ→200)', 200, r.status, r.data?.mission?.title ?? '?');

  r = await call('POST', '/practice/complete', { user: CHAMP, body: { topic: 'coffee' } });
  check('POST /practice/complete', 200, r.status, `xp=${r.data?.xpEarned}`);

  // ============ SEASONS ============
  await store.setDoc('speakingSessions', `${CHAMP}_${today}`, { userId: CHAMP, day: 21, at: new Date().toISOString() });
  await store.setDoc('exerciseAttempts', `${CHAMP}_21_season-ex`, { userId: CHAMP, day: 21, exerciseId: 'season-ex', type: 'quiz', answer: 'a', correct: true, at: new Date().toISOString() });
  await store.updateDoc('progress', CHAMP, { practiceDays: [today] });

  r = await call('GET', '/seasons/current', { user: CHAMP });
  check('GET /seasons/current (champ→200)', 200, r.status, `reward=${r.data?.reward ?? '?'}`);

  r = await call('POST', '/seasons/claim', { user: CHAMP, body: {} });
  check('POST /seasons/claim (200 o 400)', [200, 400], r.status, r.data?.error ?? `xp=${r.data?.xpEarned}`);

  // ============ SMART REVIEW ============
  r = await call('GET', '/review/smart', { user: FREE });
  check('GET /review/smart', 200, r.status, `items=${r.data?.items?.length ?? '?'}`);

  r = await call('GET', '/review/count', { user: FREE });
  check('GET /review/count', 200, r.status, `due=${r.data?.due}`);

  r = await call('GET', '/review/due', { user: FREE });
  check('GET /review/due', 200, r.status, `items=${r.data?.items?.length ?? '?'}`);

  const smartCard = r.data?.items?.[0] || (await call('GET', '/review/smart', { user: FREE })).data?.items?.[0];
  if (smartCard) {
    r = await call('POST', `/review/${smartCard.id}/result`, { user: FREE, body: { quality: 5 } });
    check('POST /review/:id/result', 200, r.status, r.data?.ok);
  } else {
    check('POST /review/:id/result (sin tarjetas — SKIP)', 200, -1);
  }

  r = await call('POST', '/review/1/result', { user: FREE, body: { quality: 9 } });
  check('POST /review/:id/result (quality inválida→400)', 400, r.status);

  // ============ VOCABULARY ============
  r = await call('POST', '/vocabulary/items', { user: FREE, body: { words: [{ en: 'apple', es: 'manzana' }, { en: 'apple', es: 'manzana' }, { en: 'book', es: 'libro' }] } });
  check('POST /vocabulary/items (dedup)', 200, r.status, `total=${r.data?.total}`);
  check('POST /vocabulary/items → total 2', 2, r.data?.total);

  r = await call('GET', '/vocabulary', { user: FREE });
  check('GET /vocabulary (free→403)', 403, r.status);

  r = await call('GET', '/vocabulary', { user: PREMIUM });
  check('GET /vocabulary (premium→200)', 200, r.status, `items=${r.data?.items?.length ?? '?'}`);

  // ============ LEADERBOARD ============
  r = await call('GET', '/leaderboard', { user: FREE });
  check('GET /leaderboard', 200, r.status, `allTime=${r.data?.allTime?.length ?? '?'} me=${r.data?.me?.userId ?? '?'}`);
  check('GET /leaderboard → me presente', FREE, r.data?.me?.userId);

  // ============ ANALYTICS ============
  r = await call('POST', '/analytics/event', { user: FREE, body: { event: 'speaking_completed', meta: { day: 1 } } });
  check('POST /analytics/event (conocido→201)', 201, r.status);

  r = await call('POST', '/analytics/event', { user: FREE, body: { event: 'evento_bogus', meta: {} } });
  check('POST /analytics/event (desconocido→400)', 400, r.status);

  r = await call('GET', '/analytics/advanced?days=7', { user: PREMIUM });
  check('GET /analytics/advanced (premium→200)', 200, r.status, `overview=${r.data?.overview ? 'ok' : '?'}`);
  check('GET /analytics/advanced → accuracy.overall.accuracyPct', true, typeof r.data?.accuracy?.overall?.accuracyPct === 'number');

  r = await call('GET', '/analytics/dashboard', { user: FREE, headers: { 'X-Dev-Admin': '1' } });
  check('GET /analytics/dashboard (dev admin→200)', 200, r.status);

  r = await call('GET', '/analytics/dashboard', { user: FREE });
  check('GET /analytics/dashboard (sin admin→403)', 403, r.status);

  // ============ REPORT ============
  r = await call('GET', '/report/weekly', { user: FREE });
  check('GET /report/weekly', 200, r.status);

  // ============ TUTOR ============
  r = await call('GET', '/tutor/modes', { user: FREE });
  check('GET /tutor/modes', 200, r.status, `modes=${r.data?.modes?.length ?? '?'}`);

  r = await call('POST', '/tutor/message', { user: FREE, body: { mode: 'conversation', message: 'Hello, how are you?' } });
  check('POST /tutor/message (free, 1er msg→200)', 200, r.status, `used=${r.data?.used}/${r.data?.limit} mock=${r.data?.mock}`);

  r = await call('POST', '/tutor/message', { user: FREE, body: { mode: 'nope', message: 'x' } });
  check('POST /tutor/message (modo inválido→400)', 400, r.status);

  r = await call('GET', '/tutor/history?mode=conversation', { user: FREE });
  check('GET /tutor/history', 200, r.status, `msgs=${r.data?.messages?.length ?? '?'}`);

  r = await call('GET', '/tutor/usage', { user: FREE });
  check('GET /tutor/usage (free)', 200, r.status, `used=${r.data?.used}/${r.data?.limit} premium=${r.data?.premium}`);

  r = await call('POST', '/tutor/stuck', { user: PREMIUM, body: { message: "I don't understand present perfect" } });
  check('POST /tutor/stuck', 200, r.status, `used=${r.data?.used} mock=${r.data?.mock}`);

  // Límite FREE (3/día): sembrar count=3 y comprobar 429.
  await store.setDoc('aiUsage', `${LIMIT_FREE}_${today}`, { userId: LIMIT_FREE, date: today, tutor: { count: 3, tokens: 0, estimatedCost: 0 } });
  r = await call('POST', '/tutor/message', { user: LIMIT_FREE, body: { mode: 'conversation', message: 'one more' } });
  check('POST /tutor/message (free límite 3/día→429)', 429, r.status, `${r.data?.used}/${r.data?.limit} ${r.data?.error}`);

  // Límite PREMIUM (60/día): activar premium + sembrar count=60.
  await call('POST', '/subscription/activate', { user: LIMIT_PREMIUM, body: { plan: 'premium', trialDays: 7 } });
  await store.setDoc('aiUsage', `${LIMIT_PREMIUM}_${today}`, { userId: LIMIT_PREMIUM, date: today, tutor: { count: 60, tokens: 0, estimatedCost: 0 } });
  r = await call('POST', '/tutor/message', { user: LIMIT_PREMIUM, body: { mode: 'conversation', message: 'one more' } });
  check('POST /tutor/message (premium límite 60/día→429)', 429, r.status, `${r.data?.used}/${r.data?.limit} ${r.data?.error}`);

  // ============ PRIVACY ============
  r = await call('GET', '/privacy/data/export', { user: FREE });
  check('GET /privacy/data/export', 200, r.status, `collections=${Object.keys(r.data?.data ?? {}).length ?? '?'}`);

  r = await call('DELETE', '/privacy/data', { user: FREE });
  check('DELETE /privacy/data', 200, r.status);

  // ============ REPORTE ============
  console.log('\n== RESULTADOS SMOKE TEST ==');
  console.log(`${'ESTADO'.padEnd(5)} ${'ESP'.padEnd(14)} ${'STATUS'.padEnd(6)} NOMBRE`);
  for (const x of results) {
    console.log(`${x.ok.padEnd(5)} ${String(x.expected).padEnd(14)} ${String(x.status).padEnd(6)} ${x.name} ${x.extra ? '→ ' + x.extra : ''}`);
  }
  console.log(`\nPASS=${pass} FAIL=${fail} TOTAL=${results.length}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('SMOKE ERROR:', e);
  process.exit(1);
});