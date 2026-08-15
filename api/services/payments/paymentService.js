// services/payments/paymentService.js
// Interfaz abstracta de pagos (providers). La API solo habla con esta interfaz:
// crear checkout, verificar webhook, mapear evento -> suscripción.
// Implementaciones: hotmart.js (V4). Otras (Stripe, MercadoPago) podrían añadirse.

// Crea un link/checkout para una suscripción.
async function createCheckout({ userId, email, plan, priceId, successUrl, cancelUrl }) {
  throw new Error('createCheckout not implemented');
}

// Verifica la firma del webhook y devuelve el payload si es válido.
async function verifyWebhook({ headers, rawBody }) {
  throw new Error('verifyWebhook not implemented');
}

// Convierte un evento del provider en una suscripción AppIngles.
// Devuelve null si el evento no cambia la suscripción.
function mapEventToSubscription(event) {
  throw new Error('mapEventToSubscription not implemented');
}

module.exports = { createCheckout, verifyWebhook, mapEventToSubscription };
