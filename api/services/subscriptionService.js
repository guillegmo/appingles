// services/subscriptionService.js
// Lógica de dominio de suscripciones: aplicar eventos de pago al store,
// resolver estado efectivo (trial expirado, etc.) y activar premium.

const store = require('../lib/store');
const entitlement = require('./entitlement');
const analytics = require('./analytics');

// Estados válidos según spec.
const STATUSES = ['free', 'trialing', 'active', 'past_due', 'canceled', 'expired'];

// Calcula el estado efectivo (un trial vencido es 'expired' → sin premium).
function effectiveStatus(subscription = {}) {
  const status = subscription.status || 'free';
  if (status === 'trialing' && subscription.trialEnd) {
    if (new Date(subscription.trialEnd) <= new Date()) return 'expired';
  }
  return status;
}

// Aplica un evento de pago mapeado (de PaymentService) al usuario.
// - email -> busca el usuario por email (en dev: usa el X-Dev-User si no hay email).
// - idempotencia: si ya se procesó providerEventId, no re-aplica.
async function applyPaymentEvent({ userId, email, mapped }, { providerEventId } = {}) {
  // Idempotencia: guardar los IDs procesados por usuario.
  const processedDoc = await store.getDoc('paymentEvents', userId);
  const processedIds = processedDoc?.processedIds || [];
  if (providerEventId && processedIds.includes(providerEventId)) {
    return { applied: false, reason: 'already_processed' };
  }

  if (mapped.providerEventId && processedIds.includes(mapped.providerEventId)) {
    return { applied: false, reason: 'already_processed' };
  }

  const current = (await store.getDoc('subscriptions', userId)) || { status: 'free', plan: 'free' };
  const status = mapped.status === 'active' ? 'active' : mapped.status;
  const next = {
    ...current,
    ...mapped,
    status,
    plan: mapped.plan || current.plan,
    updatedAt: new Date().toISOString(),
  };

  // Si viene trial y no había, activar trial
  if (mapped.trialEnd && !current.trialEnd) {
    next.status = 'trialing';
    next.trialStart = mapped.trialStart || new Date().toISOString();
    next.trialEnd = mapped.trialEnd;
  }

  await store.setDoc('subscriptions', userId, next);

  // Registrar idempotencia
  const idToSave = mapped.providerEventId || providerEventId;
  if (idToSave) {
    await store.setDoc('paymentEvents', userId, {
      userId,
      processedIds: [...processedIds, idToSave].slice(-100),
    });
  }

  // Analytics
  if (status === 'active') await analytics.trackEvent({ userId, event: 'subscription_started', meta: { plan: next.plan, provider: 'hotmart' } });
  if (status === 'canceled') await analytics.trackEvent({ userId, event: 'subscription_canceled', meta: { plan: next.plan } });

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

// Expira suscripciones vencidas (trial) — se ejecuta por lazy-check al leer status
// y opcionalmente en un cron (V5).
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

module.exports = { STATUSES, effectiveStatus, applyPaymentEvent, activateTrial, expireTrials };
