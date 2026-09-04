const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const hotmart = require('../services/payments/hotmart');
const subscriptionService = require('../services/subscriptionService');
const analytics = require('../services/analytics');

test('Hotmart: mapea PURCHASE_APPROVED -> active (plan mensual)', () => {
  const sub = hotmart.mapEventToSubscription({
    event: 'PURCHASE_APPROVED',
    id: 'evt-1',
    data: {
      subscriber: { buyer: { email: 'a@b.com' } },
      product: { id: 'premium' },
      purchase: { next_cycle_date: '2026-09-01T00:00:00Z', recurrency_number: 1 },
    },
  });
  assert.equal(sub.status, 'active');
  assert.equal(sub.plan, 'premium-monthly');
  assert.equal(sub.buyerEmail, 'a@b.com');
  assert.ok(sub.nextBillingDate);
  assert.equal(sub.renewing, false);
});

test('Hotmart: producto anual -> premium-annual', () => {
  process.env.HOTMART_PRODUCT_ANNUAL_ID = 'ann-42';
  const modPath = require.resolve('../services/payments/hotmart');
  delete require.cache[modPath];
  const hm = require('../services/payments/hotmart');
  const sub = hm.mapEventToSubscription({
    event: 'PURCHASE_APPROVED',
    data: { product: { id: 'ann-42' }, purchase: { recurrency_number: 1 } },
  });
  assert.equal(sub.plan, 'premium-annual');
  delete process.env.HOTMART_PRODUCT_ANNUAL_ID;
  delete require.cache[modPath];
});

test('Hotmart: producto lifetime por HOTMART_PRODUCT_LIFETIME_ID -> premium-lifetime', () => {
  process.env.HOTMART_PRODUCT_LIFETIME_ID = 'life-99';
  const modPath = require.resolve('../services/payments/hotmart');
  delete require.cache[modPath];
  const hm = require('../services/payments/hotmart');
  const sub = hm.mapEventToSubscription({
    event: 'PURCHASE_APPROVED',
    data: { product: { id: 'life-99' }, purchase: {} },
  });
  assert.equal(sub.plan, 'premium-lifetime');
  delete process.env.HOTMART_PRODUCT_LIFETIME_ID;
  delete require.cache[modPath];
});

test('Hotmart: producto lifetime por nombre ("AppIngles Premium de por vida") -> premium-lifetime', () => {
  const sub = hotmart.mapEventToSubscription({
    event: 'PURCHASE_APPROVED',
    data: { product: { id: 'xyz', name: 'AppIngles Premium de por vida' }, purchase: {} },
  });
  assert.equal(sub.plan, 'premium-lifetime');
});

test('Hotmart: una compra lifetime nunca expira sin evento explícito (status sigue active)', () => {
  const sub = hotmart.mapEventToSubscription({
    event: 'PURCHASE_APPROVED',
    data: { product: { id: 'xyz', name: 'AppIngles Premium de por vida' }, purchase: {} },
  });
  assert.equal(sub.status, 'active');
  // Un reembolso SÍ debe revocar el acceso (no es lo mismo que "expiración por fecha").
  const refunded = hotmart.mapEventToSubscription({
    event: 'PURCHASE_REFUNDED',
    data: { product: { id: 'xyz', name: 'AppIngles Premium de por vida' }, purchase: {} },
  });
  assert.equal(refunded.status, 'expired');
  assert.equal(refunded.plan, 'premium-lifetime');
});

test('Hotmart: renovación recurrente (recurrency_number > 1)', () => {
  const renewal = hotmart.mapEventToSubscription({
    event: 'PURCHASE_APPROVED',
    id: 'evt-2',
    data: { product: { id: 'premium' }, purchase: { recurrency_number: 2 } },
  });
  assert.equal(renewal.renewing, true);
  assert.equal(renewal.status, 'active');
});

test('Hotmart: estado real desde subscription.status (past_due)', () => {
  const sub = hotmart.mapEventToSubscription({
    event: 'SUBSCRIPTION_STATUS_UPDATE',
    data: { subscription: { status: 'past_due' } },
  });
  assert.equal(sub.status, 'past_due');
});

test('Hotmart: checkout incluye custom=userId y plan', () => {
  process.env.HOTMART_CHECKOUT_URL_MONTHLY = 'https://pay.hotmart.com/PROD';
  const modPath = require.resolve('../services/payments/hotmart');
  delete require.cache[modPath];
  const hm = require('../services/payments/hotmart');
  const r = hm.createCheckout({ email: 'a@b.com', userId: 'u-1', plan: 'monthly' });
  assert.equal(r.dev, false);
  assert.ok(r.url.includes('custom=u-1'));
  assert.ok(r.url.includes('email=a%40b.com'));
  delete process.env.HOTMART_CHECKOUT_URL_MONTHLY;
  delete require.cache[modPath];
});

test('Hotmart: checkout dev sin URL', () => {
  delete process.env.HOTMART_CHECKOUT_URL;
  delete process.env.HOTMART_CHECKOUT_URL_MONTHLY;
  delete process.env.HOTMART_CHECKOUT_URL_ANNUAL;
  const modPath = require.resolve('../services/payments/hotmart');
  delete require.cache[modPath];
  const hm = require('../services/payments/hotmart');
  const r = hm.createCheckout({ userId: 'u', plan: 'monthly' });
  assert.equal(r.dev, true);
  delete require.cache[modPath];
});

test('Hotmart: eventos sin efecto devuelven null', () => {
  assert.equal(hotmart.mapEventToSubscription({ event: 'START_SUBSCRIPTION_CREATION' }), null);
  assert.equal(hotmart.mapEventToSubscription({}), null);
});

// V11: eventos adicionales del catálogo de webhooks de Hotmart (ver comentario
// de cabecera en services/payments/hotmart.js sobre la fuente de cada uno).
test('Hotmart: PURCHASE_COMPLETE -> active (alias de PURCHASE_APPROVED)', () => {
  const sub = hotmart.mapEventToSubscription({
    event: 'PURCHASE_COMPLETE',
    data: { subscriber: { buyer: { email: 'a@b.com' } }, product: { id: 'premium' }, purchase: {} },
  });
  assert.equal(sub.status, 'active');
});

test('Hotmart: PURCHASE_DELAYED -> past_due (boleto vencido, aún no expira)', () => {
  const sub = hotmart.mapEventToSubscription({
    event: 'PURCHASE_DELAYED',
    data: { product: { id: 'premium' }, purchase: {} },
  });
  assert.equal(sub.status, 'past_due');
});

test('Hotmart: PURCHASE_PROTEST -> past_due (disputa abierta, no corta el acceso de inmediato)', () => {
  const sub = hotmart.mapEventToSubscription({
    event: 'PURCHASE_PROTEST',
    data: { product: { id: 'premium' }, purchase: {} },
  });
  assert.equal(sub.status, 'past_due');
});

test('Hotmart: SUBSCRIPTION_CANCELLATION -> canceled (nombre alternativo de SUBSCRIPTION_CANCELED)', () => {
  const sub = hotmart.mapEventToSubscription({
    event: 'SUBSCRIPTION_CANCELLATION',
    data: { product: { id: 'premium' } },
  });
  assert.equal(sub.status, 'canceled');
});

test('Hotmart: SWITCH_PLAN toma el estado real de subscription.status', () => {
  const sub = hotmart.mapEventToSubscription({
    event: 'SWITCH_PLAN',
    data: { product: { id: 'premium' }, subscription: { status: 'active' } },
  });
  assert.equal(sub.status, 'active');
});

test('Hotmart: UPDATE_SUBSCRIPTION_CHARGE_DATE refresca nextBillingDate sin cambiar el status', () => {
  const sub = hotmart.mapEventToSubscription({
    event: 'UPDATE_SUBSCRIPTION_CHARGE_DATE',
    data: {
      product: { id: 'premium' },
      subscription: { status: 'active' },
      purchase: { next_cycle_date: '2026-10-01T00:00:00Z' },
    },
  });
  assert.equal(sub.status, 'active');
  assert.equal(sub.nextBillingDate, new Date('2026-10-01T00:00:00Z').toISOString());
});

test('Hotmart: eventos informativos/de marketing se ignoran (nunca cambian el acceso)', () => {
  for (const event of ['PURCHASE_BILLET_PRINTED', 'PURCHASE_OUT_OF_SHOPPING_CART', 'CLUB_FIRST_ACCESS', 'CLUB_MODULE_COMPLETED']) {
    const sub = hotmart.mapEventToSubscription({ event, data: { product: { id: 'premium' } } });
    assert.equal(sub, null, `${event} no debe generar un cambio de estado`);
  }
});

test('Hotmart: START_SUBSCRIPTION_CREATION se ignora aunque traiga subscription.status=started', () => {
  const sub = hotmart.mapEventToSubscription({
    event: 'START_SUBSCRIPTION_CREATION',
    data: { subscription: { status: 'started' } },
  });
  assert.equal(sub, null);
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
