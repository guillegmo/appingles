// services/analytics.js
// Eventos de producto y métricas de negocio.
// - Registro de eventos: colección 'analyticsEvents' (append).
// - Dashboard: agregados sobre usuarios, suscripciones y uso de IA.

const store = require('../lib/store');

const EVENTS = [
  'user_registered',
  'onboarding_completed',
  'day_started',
  'day_completed',
  'exercise_completed',
  'speaking_started',
  'speaking_completed',
  'ai_session_started',
  'ai_session_completed',
  'trial_started',
  'paywall_viewed',
  'checkout_started',
  'subscription_started',
  'subscription_canceled',
  'subscription_renewed',
  'activation_email_sent',
  'activation_email_failed',
  'account_activated',
  'resend_requested',
  'stats_viewed',
];

// Registra un evento de usuario. at es opcional (permite rejugar en tests).
async function trackEvent({ userId, event, meta = {}, at = new Date().toISOString() }) {
  if (!EVENTS.includes(event)) return { ok: false, error: 'evento desconocido' };
  const id = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await store.setDoc('analyticsEvents', id, { userId, event, meta, at });
  return { ok: true };
}

// Punto de entrada simple para rutas autenticadas.
function eventName(req, res, next) {
  // usa body.event + body.meta
  next();
}

// ---- Métricas de negocio (dashboard) ----

const PRICE_MONTHLY_USD = Number(process.env.PRICE_MONTHLY_USD || 4.99);
const PRICE_ANNUAL_USD = Number(process.env.PRICE_ANNUAL_USD || 39.99);
const PRICE_LIFETIME_USD = Number(process.env.PRICE_LIFETIME_USD || 9.99);

// Precio mensual equivalente de cada plan (anual -> precio/12). premium-lifetime
// es pago único: NO es ingreso recurrente, así que no aporta a MRR (cae al 0
// por defecto) — se contabiliza aparte en lifetimeRevenue.
function planPricePerMonth(plan) {
  if (plan === 'premium-annual') return +(PRICE_ANNUAL_USD / 12).toFixed(2);
  if (plan === 'premium-monthly') return PRICE_MONTHLY_USD;
  return 0;
}

async function businessDashboard() {
  const subs = await store.listDocs('subscriptions');
  const active = subs.filter((s) => {
    const st = s.status;
    return st === 'active' || st === 'trialing';
  });
  const paying = active.filter((s) => s.status === 'active' && (s.plan === 'premium' || s.plan === 'premium-lifetime' || s.plan === 'premium-monthly' || s.plan === 'premium-annual'));
  const lifetimeBuyers = paying.filter((s) => s.plan === 'premium-lifetime');
  const trialing = active.filter((s) => s.status === 'trialing');

  // Cancelados/vencidos en los últimos 30 días para churn aproximado.
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const canceledRecent = subs.filter((s) => {
    const t = new Date(s.updatedAt || 0).getTime();
    return (s.status === 'canceled' || s.status === 'expired') && t >= monthAgo;
  });

  const mrr = paying.reduce((sum, s) => sum + planPricePerMonth(s.plan), 0);

  // Coste de IA acumulado (todas las fechas).
  const aiUsageDocs = await store.listDocs('aiUsage');
  let aiCost = 0;
  for (const d of aiUsageDocs) {
    for (const feature of ['tutor']) {
      if (d[feature]) aiCost += d[feature].estimatedCost || 0;
    }
  }

  // Usuarios registrados.
  const events = await store.listDocs('analyticsEvents');
  const registered = events.filter((e) => e.event === 'user_registered').length;
  const converted = events.filter((e) => e.event === 'subscription_started').length;
  const trialConversion = registered > 0 ? Math.round((converted / registered) * 100) : 0;

  // Churn mensual aproximado.
  const churn = paying.length + canceledRecent.length > 0
    ? Math.round((canceledRecent.length / (paying.length + canceledRecent.length)) * 100)
    : 0;

  return {
    subscriptionCounts: { total: subs.length, active: active.length, paying: paying.length, trialing: trialing.length, canceledRecent: canceledRecent.length, lifetimeBuyers: lifetimeBuyers.length },
    mrr,
    lifetimeRevenue: +(lifetimeBuyers.length * PRICE_LIFETIME_USD).toFixed(2),
    monthlyPrice: PRICE_MONTHLY_USD,
    annualPrice: PRICE_ANNUAL_USD,
    lifetimePrice: PRICE_LIFETIME_USD,
    churnPct: churn,
    aiTotalCost: +aiCost.toFixed(4),
    aiCostPerUser: paying.length > 0 ? +(aiCost / paying.length).toFixed(4) : 0,
    funnel: { registered, converted, trialConversionPct: trialConversion },
  };
}

module.exports = { EVENTS, trackEvent, businessDashboard, PRICE_MONTHLY_USD, PRICE_ANNUAL_USD, PRICE_LIFETIME_USD };
