// routes/subscription.js
// Estado de suscripción y entitlements (backend = fuente de verdad).
// V4: Hotmart vía PaymentService; el POST /activate es SOLO dev/seed.
// V8: el plan vendido en el paywall es 'lifetime' (pago único, $9.99, sin
// expiración); monthly/annual siguen soportados solo para quien ya los tenía.

const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const entitlement = require('../services/entitlement');
const subscriptionService = require('../services/subscriptionService');
const analytics = require('../services/analytics');
const hotmart = require('../services/payments/hotmart');
const { authenticate, invalidateSubscriptionCache } = require('../middleware/auth');

router.use(authenticate);

// GET /subscription/status
router.get('/status', async (req, res) => {
  const status = subscriptionService.effectiveStatus(req.subscription);
  const subscription = { ...req.subscription, status };
  const isDev = process.env.AUTH_MODE !== 'firebase';
  const isAdmin = req.user.id === process.env.ADMIN_USER_ID || (isDev && req.header('X-Dev-Admin') === '1');
  res.json({
    subscription,
    entitlements: entitlement.serializableEntitlements(subscription),
    // mustChangePassword viaja en el propio doc de subscriptions (ya se lee en
    // CADA request autenticado vía el caché de middleware/auth.js): así no
    // hace falta una lectura extra a Firestore solo para este flag.
    mustChangePassword: !!req.subscription?.mustChangePassword,
    isAdmin,
  });
});

// GET /subscription/plans -> precios de los planes para el paywall.
// Fuente única de precios: PRICE_MONTHLY_USD / PRICE_ANNUAL_USD / PRICE_LIFETIME_USD
// (default 4.99/39.99/9.99, alineados con los checkouts reales de Hotmart).
// El frontend NUNCA hardcodea precios. Desde V8 el paywall solo ofrece
// 'lifetime' (pago único); monthly/annual se conservan en la respuesta por
// compatibilidad con quien ya tenía una suscripción recurrente activa.
router.get('/plans', (req, res) => {
  const monthly = Number(process.env.PRICE_MONTHLY_USD || 4.99);
  const annual = Number(process.env.PRICE_ANNUAL_USD || 39.99);
  const lifetime = Number(process.env.PRICE_LIFETIME_USD || 9.99);
  res.json({
    currency: 'USD',
    savingsPct: Math.round((1 - annual / (monthly * 12)) * 100),
    plans: [
      { id: 'lifetime', label: 'Pago único', price: lifetime, period: 'lifetime', pricePerMonth: null },
      { id: 'monthly', label: 'Mensual', price: monthly, period: 'month', pricePerMonth: monthly },
      { id: 'annual', label: 'Anual', price: annual, period: 'year', pricePerMonth: +(annual / 12).toFixed(2) },
    ],
  });
});

// GET /subscription/checkout?plan=lifetime|monthly|annual -> link de pago (Hotmart).
// El custom transporta el userId para resolver al usuario en el webhook.
router.get('/checkout', (req, res) => {
  const raw = req.query.plan;
  const plan = raw === 'annual' ? 'annual' : raw === 'monthly' ? 'monthly' : 'lifetime';
  const result = hotmart.createCheckout({
    email: req.user.email || '',
    userId: req.user.id,
    plan,
    successUrl: process.env.HOTMART_SUCCESS_URL,
    cancelUrl: process.env.HOTMART_CANCEL_URL,
  });
  res.json(result);
});

// POST /subscription/cancel -> el usuario vuelve a la versión Free.
// Conserva el reto de 21 días (gratis para siempre); pierde los beneficios de IA.
router.post('/cancel', async (req, res) => {
  try {
    const current = req.subscription || { status: 'free', plan: 'free' };
    const effective = subscriptionService.effectiveStatus(current);
    if (effective !== 'active' && effective !== 'trialing') {
      return res.status(400).json({ error: 'no_active_subscription', message: 'No tienes una suscripción activa.' });
    }
    const next = {
      ...current,
      status: 'canceled',
      canceledBy: 'user',
      canceledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.setDoc('subscriptions', req.user.id, next);
    invalidateSubscriptionCache(req.user.id);
    await analytics.trackEvent({
      userId: req.user.id,
      event: 'subscription_canceled',
      meta: { source: 'paywall', plan: current.plan },
    });
    res.json({ subscription: next, entitlements: entitlement.serializableEntitlements(next) });
  } catch (err) {
    res.status(500).json({ error: 'cancel_failed', message: err.message });
  }
});

// POST /subscription/activate -> SOLO dev/seed (en producción lo hace el webhook).
router.post('/activate', async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const hotmartConfigured = Boolean(process.env.HOTMART_WEBHOOK_SECRET && process.env.HOTMART_CHECKOUT_URL);
  if (isProduction || hotmartConfigured) {
    return res.status(403).json({ error: 'Solo el webhook de pagos puede activar Premium en producción.' });
  }
  const { plan = 'premium', trialDays = 7 } = req.body || {};
  const subscription = await subscriptionService.activateTrial(req.user.id, { plan, trialDays });
  res.json({ subscription, entitlements: entitlement.serializableEntitlements(subscription) });
});

module.exports = router;
