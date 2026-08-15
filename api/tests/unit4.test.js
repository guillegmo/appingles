const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const hotmart = require('../services/payments/hotmart');
const subscriptionService = require('../services/subscriptionService');
const analytics = require('../services/analytics');

test('Hotmart: mapea PURCHASE_APPROVED -> active', () => {
  const sub = hotmart.mapEventToSubscription({
    event: 'PURCHASE_APPROVED',
    id: 'evt-1',
    data: {
      subscriber: { buyer: { email: 'a@b.com' } },
      product: { id: 'premium' },
      purchase: { next_cycle_date: '2026-09-01T00:00:00Z' },
    },
  });
  assert.equal(sub.status, 'active');
  assert.equal(sub.plan, 'premium');
  assert.equal(sub.buyerEmail, 'a@b.com');
  assert.ok(sub.nextBillingDate);
});

test('Hotmart: eventos sin efecto devuelven null', () => {
  assert.equal(hotmart.mapEventToSubscription({ event: 'START_SUBSCRIPTION_CREATION' }), null);
  assert.equal(hotmart.mapEventToSubscription({}), null);
});

test('Hotmart: firma HMAC válida/inválida', () => {
  const secret = 's3cret';
  process.env.HOTMART_WEBHOOK_SECRET = secret;
  delete process.env.HOTMART_WEBHOOK_TOKEN;
  delete process.env.NODE_ENV;

  const body = JSON.stringify({ event: 'PURCHASE_APPROVED' });
  const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');

  // Recargar módulo para leer el secret (require cache)
  const modPath = require.resolve('../services/payments/hotmart');
  delete require.cache[modPath];
  const hm = require('../services/payments/hotmart');

  const ok = hm.verifyWebhook({ headers: { 'x-hotmart-signature': sig }, rawBody: body });
  assert.equal(ok.valid, true);
  assert.equal(ok.payload.event, 'PURCHASE_APPROVED');

  const bad = hm.verifyWebhook({ headers: { 'x-hotmart-signature': 'nope' }, rawBody: body });
  assert.equal(bad.valid, false);

  delete process.env.HOTMART_WEBHOOK_SECRET;
  delete require.cache[modPath];
});

test('Subscription: estado efectivo con trial vencido', () => {
  const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
  assert.equal(subscriptionService.effectiveStatus({ status: 'trialing', trialEnd: past }), 'expired');
  assert.equal(subscriptionService.effectiveStatus({ status: 'active' }), 'active');
  assert.equal(subscriptionService.effectiveStatus({}), 'free');
});

test('Subscription: applyPaymentEvent es idempotente', async () => {
  const docs = {};
  const s = subscriptionService;
  const original = require('../lib/store');
  // Mock del store
  const storeMock = {
    getDoc: async (c, id) => docs[id] || null,
    setDoc: async (c, id, data) => { docs[id] = data; return data; },
    updateDoc: async (c, id, patch) => { docs[id] = { ...(docs[id] || {}), ...patch }; return docs[id]; },
    listDocs: async () => Object.values(docs),
  };
  // Sustituir store y analytics (require cache sencillo)
  const libStore = require('../lib/store');
  const originalStore = { ...libStore };
  const analyticsModule = require('../services/analytics');
  const originalTrack = analyticsModule.trackEvent;
  analyticsModule.trackEvent = async () => ({ ok: true });
  // Inyectamos mock via asignación a lib/store export
  for (const k of Object.keys(storeMock)) libStore[k] = storeMock[k];

  const mapped = {
    provider: 'hotmart',
    providerEventId: 'evt-9',
    plan: 'premium',
    status: 'active',
    buyerEmail: 'x@y.com',
  };

  const r1 = await subscriptionService.applyPaymentEvent({ userId: 'u1', mapped });
  assert.equal(r1.applied, true);
  assert.equal(r1.subscription.status, 'active');

  const r2 = await subscriptionService.applyPaymentEvent({ userId: 'u1', mapped });
  assert.equal(r2.applied, false);
  assert.equal(r2.reason, 'already_processed');

  // Restaurar
  for (const k of Object.keys(originalStore)) libStore[k] = originalStore[k];
  analyticsModule.trackEvent = originalTrack;
});

test('Analytics: solo eventos conocidos', async () => {
  assert.ok(analytics.EVENTS.includes('day_completed'));
  assert.ok(analytics.EVENTS.includes('subscription_started'));
  assert.ok(!analytics.EVENTS.includes('unknown_event'));
});

test('Analytics: trackEvent falla con evento desconocido', async () => {
  const result = await analytics.trackEvent({ userId: 'u', event: 'nope' });
  assert.equal(result.ok, false);
});
