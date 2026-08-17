// services/subscriptionService.js
// Lógica de dominio de suscripciones: aplicar eventos de pago al store,
// resolver estado efectivo, activar premium y detectar renovaciones.

const store = require('../lib/store');
const entitlement = require('./entitlement');
const analytics = require('./analytics');

// Estados válidos según spec.
const STATUSES = ['free', 'trialing', 'active', 'past_due', 'canceled', 'expired'];

// Normaliza un email para usarlo como id de índice.
function emailKey(email) {
  return String(email || '').trim().toLowerCase();
}

// Registra la relación email -> userId (índice para resolver webhooks sin custom).
async function linkEmailToUser(userId, email) {
  const key = emailKey(email);
  if (!userId || !key) return;
  await store.setDoc('userEmails', key, { userId, email: key, updatedAt: new Date().toISOString() });
}

// Resuelve el userId de un webhook: prioridad al custom (userId directo),
// luego al índice por email.
async function resolveUser({ userId, email }) {
  if (userId) {
    await linkEmailToUser(userId, email);
    return userId;
  }
  const key = emailKey(email);
  if (!key) return null;
  const doc = await store.getDoc('userEmails', key);
  return doc?.userId || null;
}

// Calcula el estado efectivo (un trial vencido es 'expired' → sin premium).
function effectiveStatus(subscription = {}) {
  const status = subscription.status || 'free';
  if (status === 'trialing' && subscription.trialEnd) {
    if (new Date(subscription.trialEnd) <= new Date()) return 'expired';
  }
  return status;
}

// Aplica un evento de pago mapeado (de PaymentService) al usuario.
// - idempotencia: si ya se procesó providerEventId, no re-aplica.
// - renovaciones: si ya estaba activo y el evento es un nuevo ciclo,
//   registra subscription_renewed y actualiza nextBillingDate.
async function applyPaymentEvent({ userId, email, mapped }, { providerEventId } = {}) {
  const processedDoc = await store.getDoc('paymentEvents', userId);
  const processedIds = processedDoc?.processedIds || [];
  if (providerEventId && processedIds.includes(providerEventId)) {
    return { applied: false, reason: 'already_processed' };
  }
  if (mapped.providerEventId && processedIds.includes(mapped.providerEventId)) {
    return { applied: false, reason: 'already_processed' };
  }

  await linkEmailToUser(userId, email);

  const current = (await store.getDoc('subscriptions', userId)) || { status: 'free', plan: 'free' };
  const wasActive = current.status === 'active' || current.status === 'trialing';
  const status = mapped.status === 'active' ? 'active' : mapped.status;

  const next = {
    ...current,
    ...mapped,
    status,
    plan: mapped.plan || current.plan,
    updatedAt: new Date().toISOString(),
  };
  if (mapped.nextBillingDate) next.nextBillingDate = mapped.nextBillingDate;

  // Trial (dev/seed): solo si viene explícito y no había uno.
  if (mapped.trialEnd && !current.trialEnd) {
    next.status = 'trialing';
    next.trialStart = mapped.trialStart || new Date().toISOString();
    next.trialEnd = mapped.trialEnd;
  }

  await store.setDoc('subscriptions', userId, next);

  const idToSave = mapped.providerEventId || providerEventId;
  if (idToSave) {
    await store.setDoc('paymentEvents', userId, {
      userId,
      processedIds: [...processedIds, idToSave].slice(-100),
    });
  }

  // Analytics.
  if (status === 'active') {
    if (mapped.renewing && wasActive) {
      await analytics.trackEvent({ userId, event: 'subscription_renewed', meta: { plan: next.plan, provider: 'hotmart' } });
    } else {
      await analytics.trackEvent({ userId, event: 'subscription_started', meta: { plan: next.plan, provider: 'hotmart' } });
    }
  }
  if (status === 'canceled') {
    await analytics.trackEvent({ userId, event: 'subscription_canceled', meta: { plan: next.plan } });
  }

  return { applied: true, subscription: next };
}

// Activa trial (usado en dev para probar el flujo Premium).
async function activateTrial(userId, { plan = 'premium', trialDays = 7 } = {}) {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const subscription = {
    status: 'trialing',
    plan,
    trialStart: now.toISOString(),
    trialEnd: trialEnd.toISOString(),
    provider: 'dev',
    updatedAt: now.toISOString(),
  };
  await store.setDoc('subscriptions', userId, subscription);
  await analytics.trackEvent({ userId, event: 'trial_started', meta: { plan, trialDays } });
  return subscription;
}

// Expira suscripciones vencidas (trial) — lazy-check al leer status y opcional cron.
async function expireTrials(now = new Date()) {
  const subs = await store.listDocs('subscriptions');
  let expired = 0;
  for (const s of subs) {
    const status = effectiveStatus(s);
    if (status !== s.status) {
      await store.updateDoc('subscriptions', s.id, { status: 'expired', updatedAt: now.toISOString() });
      expired++;
    }
  }
  return expired;
}

module.exports = { STATUSES, effectiveStatus, applyPaymentEvent, activateTrial, expireTrials, resolveUser, linkEmailToUser };