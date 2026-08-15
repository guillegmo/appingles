// services/payments/hotmart.js
// Proveedor Hotmart (V4).
// - Webhooks firmados con HMAC (clave webhook + token).
// - Checkout vía link con parámetros (checkout_token opcional).
//
// Documentación de referencia (simplificada para MVP):
//   Hotmart envía eventos tipo 'PURCHASE_APPROVED', 'SUBSCRIPTION_CANCELED',
//   'SUBSCRIPTION_STATUS_UPDATE', 'PURCHASE_REFUNDED', etc.
//   El body incluye: { event, data: { subscriber: { buyer: { email } }, product, purchase: {...} } }
//
// La verificación real de firma depende de la configuración de la cuenta
// (webhook secret/token). Aquí se implementa HMAC-SHA256 con HOTMART_WEBHOOK_SECRET
// y, si se provee HOTMART_WEBHOOK_TOKEN, se valida también como fallback.

const crypto = require('crypto');

const SECRET = process.env.HOTMART_WEBHOOK_SECRET || '';
const TOKEN = process.env.HOTMART_WEBHOOK_TOKEN || '';

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// Eventos de Hotmart que importan para el estado de la suscripción.
const EVENT_MAP = {
  PURCHASE_APPROVED: 'active',
  PURCHASE_APPROVED_BY_CARD: 'active',
  SUBSCRIPTION_STATUS_UPDATE: 'active', // según status interno
  PURCHASE_CANCELED: 'canceled',
  SUBSCRIPTION_CANCELED: 'canceled',
  PURCHASE_REFUNDED: 'expired',
  PURCHASE_EXPIRED: 'expired',
  SUBSCRIPTION_SUSPENDED: 'past_due',
  SUBSCRIPTION_DEBT_RECOVERY: 'past_due',
};

function normalizeStatus(event) {
  // Algunos eventos traen el estado en el body (data.purchase.status).
  const status = EVENT_MAP[event];
  if (status) return status;
  return null;
}

// Verifica firma HMAC. En Hotmart, el header puede ser 'x-hotmart-notification-secret'
// o el token como query param. Para MVP: HMAC-SHA256 del body con el secret.
function verifyWebhook({ headers = {}, rawBody = '' }) {
  if (!SECRET) {
    // Sin secret configurado, rechazamos en producción pero aceptamos en dev.
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
  const status = normalizeStatus(eventName);
  if (!status) return null;

  const data = event?.data || {};
  const buyerEmail = data?.subscriber?.buyer?.email || data?.buyer?.email || '';
  const productId = data?.product?.id || 'premium';
  const plan = productId === 'free' ? 'free' : 'premium';
  const nextCycle = data?.purchase?.next_cycle_date
    ? new Date(data.purchase.next_cycle_date).toISOString()
    : undefined;
  const eventId = event?.id || event?.data?.purchase?.transaction || `${Date.now()}`;

  return {
    provider: 'hotmart',
    providerEventId: String(eventId),
    buyerEmail,
    plan,
    status,
    subscriptionId: String(event?.data?.purchase?.subscription || event?.data?.subscription?.id || ''),
    nextBillingDate: nextCycle,
    updatedAt: new Date().toISOString(),
  };
}

// Crea un link de checkout Hotmart (MVP: link con parámetros de producto).
function createCheckout({ email, plan = 'premium', successUrl, cancelUrl }) {
  const base = process.env.HOTMART_CHECKOUT_URL;
  if (!base) return { url: null, dev: true, reason: 'HOTMART_CHECKOUT_URL no configurado (modo dev)' };

  const url = new URL(base);
  const params = url.searchParams;
  params.set('email', email);
  if (successUrl) params.set('return_to', successUrl);
  if (cancelUrl) params.set('cancel_url', cancelUrl);
  // plan/hm: pasar como parámetro opcional de oferta.
  return { url: url.toString(), dev: false };
}

module.exports = { verifyWebhook, mapEventToSubscription, createCheckout, normalizeStatus, safeJsonParse };
