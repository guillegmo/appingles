// routes/subscription.js
// Estado de suscripción y entitlements (backend = fuente de verdad).
// V4: Hotmart vía PaymentService; el POST /activate es SOLO dev/seed.

const express = require('express');
const router = express.Router();
const entitlement = require('../services/entitlement');
const subscriptionService = require('../services/subscriptionService');
const hotmart = require('../services/payments/hotmart');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /subscription/status
router.get('/status', async (req, res) => {
  const status = subscriptionService.effectiveStatus(req.subscription);
  const subscription = { ...req.subscription, status };
  res.json({
    subscription,
    entitlements: entitlement.serializableEntitlements(subscription),
  });
});

// GET /subscription/checkout -> link de pago (Hotmart). Dev: url null.
router.get('/checkout', (req, res) => {
  const result = hotmart.createCheckout({
    email: req.user.email || '',
    plan: 'premium',
    successUrl: process.env.HOTMART_SUCCESS_URL,
    cancelUrl: process.env.HOTMART_CANCEL_URL,
  });
  res.json(result);
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
