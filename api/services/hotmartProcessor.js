// services/hotmartProcessor.js
// Orquestador del flujo COMPRA EXTERNA → USUARIO → ACCESO → EMAIL DE ACTIVACIÓN.
// Lo usan tanto la ruta del webhook como los tests unitarios.
//
// Garantías:
// - Idempotencia en dos capas: registro global hotmartEvents/{transactionId}
//   (auditoría cross-evento) + paymentEvents/{uid}.processedIds (por usuario,
//   ya existente). Un webhook duplicado nunca duplica usuario, acceso ni email.
// - La activación de acceso SOLO ocurre aquí (backend), tras validar la firma
//   en la ruta: el frontend jamás determina si alguien pagó.
// - El email se envía solo cuando tiene sentido: alta nueva o usuario sin
//   contraseña creada, y no en renovaciones de ciclos ya activos.

const store = require('../lib/store');
const hotmart = require('./payments/hotmart');
const subscriptionService = require('./subscriptionService');
const provisioning = require('./provisioning');
const mailer = require('./mailer');
const analytics = require('./analytics');

// Estados de suscripción que dan acceso al producto.
const ACCESS_STATUSES = ['active', 'trialing', 'past_due'];

function txKey(mapped) {
  return mapped.transactionId || mapped.providerEventId;
}

async function markProcessed(key, mapped, extra = {}) {
  await store.setDoc('hotmartEvents', String(key), {
    transactionId: mapped.transactionId || null,
    eventId: mapped.providerEventId,
    eventType: extra.eventType || null,
    email: mapped.buyerEmail || null,
    productId: mapped.productId || null,
    status: mapped.status,
    plan: mapped.plan || null,
    ...extra,
    processedAt: new Date().toISOString(),
  });
}

// Procesa un payload de Hotmart YA VERIFICADO (la firma se valida en la ruta).
async function processHotmartEvent(payload) {
  const mapped = hotmart.mapEventToSubscription(payload);
  if (!mapped) {
    return { ok: true, ignored: true, event: payload?.event };
  }

  // Capa 1: registro global por transacción/evento.
  const key = txKey(mapped);
  const alreadyRegistered = key ? await store.getDoc('hotmartEvents', String(key)) : null;
  if (alreadyRegistered?.processedAt) {
    console.log(`[hotmart] webhook_duplicate key=${key}`);
    return { ok: true, duplicate: true };
  }

  // Resolución del usuario: custom=userId → índice email → crear en Firebase Auth.
  // En dev, devUserId permite simular el flujo para un usuario existente.
  const custom =
    payload?.data?.custom || payload?.custom || payload?.devUserId || null;
  let userId = custom ? String(custom) : await subscriptionService.resolveUser({ email: mapped.buyerEmail });
  let created = false;
  let hasPassword = true;

  if (!userId) {
    if (!mapped.buyerEmail) {
      return { ok: false, error: 'user_not_resolvable' };
    }
    const res = await provisioning.findOrCreateAuthUser({
      email: mapped.buyerEmail,
      name: mapped.buyerName,
    });
    userId = res.userId;
    created = res.created;
    hasPassword = res.hasPassword ?? true;
    console.log(`[hotmart] ${created ? 'user_created' : 'user_found'} userId=${userId}`);
  }

  // Estado previo para decidir envío de email y analítica.
  const prev = (await store.getDoc('subscriptions', userId)) || { status: 'free', plan: 'free' };
  const prevAccess = ACCESS_STATUSES.includes(prev.status);
  const prevPlan = prev.plan;

  const result = await subscriptionService.applyPaymentEvent(
    { userId, email: mapped.buyerEmail, mapped },
    { providerEventId: mapped.providerEventId },
  );

  if (!result.applied) {
    if (key) await markProcessed(key, mapped, { eventType: payload?.event, note: result.reason });
    return { ok: true, applied: false, reason: result.reason };
  }

  console.log(`[hotmart] access_${mapped.status === 'active' ? 'activated' : 'updated'} userId=${userId} plan=${result.subscription.plan}`);

  // Email de activación: alta nueva o usuario sin contraseña; nunca en
  // renovaciones de ciclos ya activos (evita spam mensual).
  let activationEmailSent = false;
  const isRenewalOfActive = mapped.renewing && prevAccess;
  const isNewProductForUser = mapped.plan !== prevPlan;
  if (mapped.status === 'active' && !isRenewalOfActive && (created || !hasPassword || isNewProductForUser)) {
    try {
      const link = await provisioning.generateActivationLink(mapped.buyerEmail);
      const mail = await mailer.sendActivationEmail({
        to: mapped.buyerEmail,
        name: mapped.buyerName,
        link,
      });
      activationEmailSent = mail.transport === 'smtp';
      await analytics.trackEvent({
        userId,
        event: 'activation_email_sent',
        meta: { plan: result.subscription.plan, transport: mail.transport },
      });
    } catch (err) {
      console.error(`[hotmart] activation_email_failed userId=${userId} error=${err.message}`);
      await analytics.trackEvent({
        userId,
        event: 'activation_email_failed',
        meta: { plan: result.subscription.plan },
      }).catch(() => {});
    }
  }

  if (key) await markProcessed(key, mapped, { eventType: payload?.event, userId });

  return {
    ok: true,
    applied: true,
    created,
    activationEmailSent,
    subscription: result.subscription,
  };
}

// Reenvío del enlace de activación (página /activar-acceso).
// - Solo envía si existe compra/acceso activo para ese email (si no, responde
//   igual de genérico desde la ruta: no se revela si la cuenta existe).
// - Cooldown por email (60s) además del rate limit por IP de la ruta.
// Devuelve { sent: boolean, reason?: string }.
async function resendActivationForEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return { sent: false, reason: 'email_requerido' };

  const userId = await subscriptionService.resolveUser({ email: normalized });
  if (!userId) {
    console.log(`[hotmart] resend_requested email=*** no_purchase_record`);
    return { sent: false, reason: 'sin_compra' };
  }
  const sub = await store.getDoc('subscriptions', userId);
  const status = subscriptionService.effectiveStatus(sub || {});
  if (!ACCESS_STATUSES.includes(status)) {
    console.log(`[hotmart] resend_requested email=*** status=${status} sin_acceso`);
    return { sent: false, reason: 'sin_acceso' };
  }

  const cooldownDoc = await store.getDoc('activationRequests', normalized);
  const last = cooldownDoc?.lastSentAt ? new Date(cooldownDoc.lastSentAt).getTime() : 0;
  if (Date.now() - last < 60_000) {
    console.log(`[hotmart] resend_throttled email=***`);
    return { sent: false, reason: 'cooldown' };
  }

  const link = await provisioning.generateActivationLink(normalized);
  const mail = await mailer.sendActivationEmail({ to: normalized, link });
  await store.setDoc('activationRequests', normalized, { lastSentAt: new Date().toISOString() });
  await analytics.trackEvent({ userId, event: 'resend_requested', meta: {} }).catch(() => {});
  return { sent: mail.transport === 'smtp', transport: mail.transport };
}

module.exports = { processHotmartEvent, resendActivationForEmail, ACCESS_STATUSES };
