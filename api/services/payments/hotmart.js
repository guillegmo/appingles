// services/payments/hotmart.js
// Proveedor Hotmart (V4, extendido en V7 para recurrencia en producción).
// - Webhooks firmados con HMAC (clave webhook + token).
// - Checkout vía link con parámetros (email, custom=userId, plan mensual/anual).
// - Mapeo de eventos a estados reales de la suscripción + renovaciones.
//
// Referencia (V7):
//   Hotmart envía eventos tipo 'PURCHASE_APPROVED' (también por renovación),
//   'PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'PURCHASE_EXPIRED',
//   'SUBSCRIPTION_CANCELED', 'SUBSCRIPTION_STATUS_UPDATE',
//   'SUBSCRIPTION_PLAN_CHANGED', 'SUBSCRIPTION_REACTIVATION',
//   'SUBSCRIPTION_SUSPENDED' (overdue), 'SUBSCRIPTION_DEBT_RECOVERY'.
//   El body incluye: { event, data: { subscriber: { buyer: { email } }, product, purchase, subscription } }
//   En el checkout se pasa custom=userId para poder resolver el usuario en el webhook.

const crypto = require('crypto');

const SECRET = process.env.HOTMART_WEBHOOK_SECRET || '';
const TOKEN = process.env.HOTMART_WEBHOOK_TOKEN || '';

const CHECKOUT_URLS = {
  monthly: process.env.HOTMART_CHECKOUT_URL_MONTHLY || process.env.HOTMART_CHECKOUT_URL || '',
  annual: process.env.HOTMART_CHECKOUT_URL_ANNUAL || process.env.HOTMART_CHECKOUT_URL || '',
};
const PRODUCT_ANNUAL_ID = process.env.HOTMART_PRODUCT_ANNUAL_ID || '';

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// Estados de evento que importan. La mayoría de eventos recurrentes traen el
// estado real en data.subscription.status o data.purchase.status.
function normalizeStatus(event) {
  const map = {
    PURCHASE_APPROVED: 'active',
    PURCHASE_APPROVED_BY_CARD: 'active',
    PURCHASE_CANCELED: 'canceled',
    PURCHASE_REFUNDED: 'expired',
    PURCHASE_EXPIRED: 'expired',
    SUBSCRIPTION_CANCELED: 'canceled',
    SUBSCRIPTION_SUSPENDED: 'past_due',
    SUBSCRIPTION_DEBT_RECOVERY: 'past_due',
  };
  return map[event] || null;
}

// Estado real de una suscripción desde el body de Hotmart (V7).
const SUB_STATUS = {
  active: 'active',
  started: 'active',
  canceled: 'canceled',
  cancelled: 'canceled',
  past_due: 'past_due',
  'past due': 'past_due',
  expired: 'expired',
  inactive: 'canceled',
  grace_period: 'trialing',
};

// Decide si el evento es una renovación recurrente (no el primer cobro).
function isRenewal(event, data) {
  if (event !== 'PURCHASE_APPROVED' && event !== 'PURCHASE_APPROVED_BY_CARD') return false;
  const recurrency = Number(data?.purchase?.recurrency_number || data?.recurrency_number || 0);
  if (recurrency > 1) return true;
  // El primer cobro tras un período de gracia también es una "renovación" del ciclo.
  return Boolean(data?.purchase?.subscription && recurrency >= 1 && data?.subscription?.created_date);
}

// Verifica firma HMAC. En Hotmart, el header puede ser 'x-hotmart-signature' o
// 'x-hotmart-notification-secret', o el token como query param (legacy).
function verifyWebhook({ headers = {}, rawBody = '' }) {
  if (!SECRET) {
    if (process.env.NODE_ENV === 'production') {
      return { valid: false, reason: 'HOTMART_WEBHOOK_SECRET no configurado' };
    }
    return { valid: true, payload: safeJsonParse(rawBody) || {}, dev: true };
  }

  const signature = headers['x-hotmart-signature'] || headers['x-hotmart-notification-secret'] || '';
  if (!signature) return { valid: false, reason: 'Firma ausente' };

  const expected = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
  const provided = signature.toLowerCase();
  const valid = provided === expected || (TOKEN && provided === TOKEN.toLowerCase());
  if (!valid) return { valid: false, reason: 'Firma inválida' };

  return { valid: true, payload: safeJsonParse(rawBody) || {} };
}

// Mapea un evento Hotmart a una suscripción AppIngles.
function mapEventToSubscription(event) {
  const eventName = event?.event;
  const data = event?.data || {};

  // Estado real: prioridad al estado de la suscripción, luego al de la compra.
  let status = normalizeStatus(eventName);
  const subStatusRaw = data?.subscription?.status || data?.subscription_status;
  if (subStatusRaw && SUB_STATUS[String(subStatusRaw).toLowerCase()]) {
    status = SUB_STATUS[String(subStatusRaw).toLowerCase()];
  }
  if (!status && data?.purchase?.status) {
    const pStatus = String(data.purchase.status).toLowerCase();
    if (pStatus === 'approved' || pStatus === 'complete' || pStatus === 'active') status = 'active';
    else if (pStatus === 'canceled' || pStatus === 'cancelled') status = 'canceled';
    else if (pStatus === 'refunded' || pStatus === 'chargeback') status = 'expired';
    else if (pStatus === 'overdue' || pStatus === 'delayed' || pStatus === 'expired') status = 'past_due';
  }
  if (!status) return null;

  const buyerEmail = data?.subscriber?.buyer?.email || data?.buyer?.email || '';
  const productId = data?.product?.id || data?.product_id || 'premium';
  const productName = String(data?.product?.name || '').toLowerCase();

  // Plan: anual si el product id/name coincide, si no mensual (premium).
  let plan = 'premium-monthly';
  if (PRODUCT_ANNUAL_ID && String(productId) === PRODUCT_ANNUAL_ID) plan = 'premium-annual';
  else if (/annual|anual|año|ano/i.test(productName)) plan = 'premium-annual';

  const nextCycle = data?.purchase?.next_cycle_date
    ? new Date(data.purchase.next_cycle_date).toISOString()
    : undefined;
  const eventId = event?.id || data?.purchase?.transaction || `${Date.now()}`;

  return {
    provider: 'hotmart',
    providerEventId: String(eventId),
    buyerEmail,
    plan,
    status,
    subscriptionId: String(data?.purchase?.subscription || data?.subscription?.id || ''),
    nextBillingDate: nextCycle,
    renewing: isRenewal(eventName, data),
    updatedAt: new Date().toISOString(),
  };
}

// Crea un link de checkout Hotmart. El 'custom' transporta el userId para que el
// webhook pueda resolver el usuario en producción.
function createCheckout({ email, userId, plan = 'monthly', successUrl, cancelUrl }) {
  const base = CHECKOUT_URLS[plan] || CHECKOUT_URLS.monthly;
  if (!base) return { url: null, dev: true, reason: 'HOTMART_CHECKOUT_URL no configurado (modo dev)' };

  const url = new URL(base);
  const params = url.searchParams;
  params.set('email', email || '');
  if (userId) params.set('custom', userId);
  if (successUrl) params.set('return_to', successUrl);
  if (cancelUrl) params.set('cancel_url', cancelUrl);
  return { url: url.toString(), dev: false, plan };
}

module.exports = { verifyWebhook, mapEventToSubscription, createCheckout, normalizeStatus, isRenewal, safeJsonParse };