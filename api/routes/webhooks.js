// routes/webhooks.js
// Webhooks de pagos (Hotmart). Verificación de firma + idempotencia + sync.
// Montado en /webhooks (fuera de /api y sin auth de usuario).

const express = require('express');
const router = express.Router();
const hotmart = require('../services/payments/hotmart');
const subscriptionService = require('../services/subscriptionService');

// POST /webhooks/hotmart
// Cuerpo firmado por Hotmart. Puede NO tener email si el evento no incluye buyer.
// En dev (AUTH_MODE=dev) aceptamos un campo "devUserId" para simular el flujo.
router.post('/hotmart', async (req, res) => {
  try {
    // Raw body capturado por express.json({ verify }) en server.js
    const rawBody = req.rawBody || '';
    const { valid, payload, dev, reason } = hotmart.verifyWebhook({
      headers: req.headers,
      rawBody,
    });
    if (!valid && !dev) {
      return res.status(401).json({ error: 'invalid_signature', reason });
    }

    const mapped = hotmart.mapEventToSubscription(payload);
    if (!mapped) {
      // Evento que no cambia la suscripción (p.ej. 'START_SUBSCRIPTION_CREATION').
      return res.json({ ok: true, ignored: true, event: payload?.event });
    }

    // Resolución del usuario: preferimos devUserId (dev), luego email (prod).
    // En producción, Hotmart debe asociarse al userId real vía campo custom o
    // por email del buyer (requiere tabla de usuarios).
    let userId = payload?.data?.custom || req.body?.devUserId || null;
    if (!userId && dev) userId = req.body?.devUserId || null;

    if (!userId) {
      // No podemos resolver el usuario: en prod, mapear por email.
      return res.status(422).json({ error: 'user_not_resolvable', email: mapped.buyerEmail || null });
    }

    const result = await subscriptionService.applyPaymentEvent(
      { userId, email: mapped.buyerEmail, mapped },
      { providerEventId: mapped.providerEventId },
    );

    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'webhook_failed', message: err.message });
  }
});

module.exports = router;
