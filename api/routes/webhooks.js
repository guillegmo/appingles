// routes/webhooks.js
// Webhooks de pagos (Hotmart). Verificación de firma + idempotencia +
// provisioning + email de activación (services/hotmartProcessor).
// Montado en /webhooks (fuera de /api y sin auth de usuario).

const express = require('express');
const router = express.Router();
const hotmart = require('../services/payments/hotmart');
const processor = require('../services/hotmartProcessor');

// Solo NOMBRES de campos y headers presentes — nunca valores (evita loguear
// el Hottok, la firma o datos del comprador). Ver comentario de uso abajo.
function safeShapeForDebug(headers, rawBody) {
  const relevantHeaders = Object.keys(headers || {}).filter((h) => /hotmart|hottok|signature/i.test(h));
  const payload = hotmart.safeJsonParse(rawBody) || {};
  return {
    event: payload.event || null,
    topLevelKeys: Object.keys(payload),
    dataKeys: payload.data ? Object.keys(payload.data) : null,
    hasTopLevelHottok: 'hottok' in payload,
    hasDataHottok: !!(payload.data && 'hottok' in payload.data),
    relevantHeaders,
  };
}

// GET /webhooks/hotmart — el panel de Hotmart valida la URL con una petición
// GET al guardarla (antes de que exista ningún evento real que enviar); sin
// este handler, esa validación recibía el 404 genérico de Express (la ruta
// solo estaba registrada para POST) y Hotmart reportaba la URL como inválida.
router.get('/hotmart', (req, res) => res.status(200).json({ ok: true }));

// POST /webhooks/hotmart
// Cuerpo firmado por Hotmart. Puede NO tener email si el evento no incluye buyer.
// En dev (sin HOTMART_WEBHOOK_SECRET y NODE_ENV!=production) acepta sin firma
// para poder simular el flujo.
router.post('/hotmart', async (req, res) => {
  try {
    // Raw body capturado por express.json({ verify }) en server.js
    const rawBody = req.rawBody || '';
    const { valid, payload, dev, reason } = hotmart.verifyWebhook({
      headers: req.headers,
      rawBody,
    });
    if (!valid && !dev) {
      // Diagnóstico temporal (V11.1): distintos tipos de evento de prueba de
      // Hotmart están mandando el Hottok en formas distintas ("Firma ausente"
      // en unos, 200 OK en otros) — se registra la FORMA del payload (nombres
      // de campos, nunca valores de buyer/hottok/firma) para ubicar dónde
      // viene realmente en el evento que está fallando, sin exponer datos
      // sensibles en los logs.
      const shape = safeShapeForDebug(req.headers, rawBody);
      console.warn(`[hotmart] webhook_rejected reason=${reason} shape=${JSON.stringify(shape)}`);
      return res.status(401).json({ error: 'invalid_signature', reason });
    }

    console.log(`[hotmart] webhook_received event=${payload?.event || '?'}`);

    const result = await processor.processHotmartEvent(payload);
    if (!result.ok) {
      return res.status(422).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'webhook_failed', message: err.message });
  }
});

module.exports = router;
