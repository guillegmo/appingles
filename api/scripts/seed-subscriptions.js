// scripts/seed-subscriptions.js
// DEV ONLY — inserta documentos de ejemplo de la colección 'subscriptions' para
// ver cómo se ve cada estado en la base de datos (file o firebase).
//
// Uso:
//   node scripts/seed-subscriptions.js [userId]
//   (si omites userId, usa 'demo-user')
//
// Crea en 'subscriptions/{userId}':
//   free · trialing · active (monthly) · active (annual) · past_due · canceled · expired
// Además seedea 'paymentEvents/{userId}' (idempotencia) y 'userEmails/{email}'
// (índice email→userId) para el caso activo, tal como los deja Hotmart en producción.

require('dotenv').config();
const store = require('../lib/store');
const subscriptionService = require('../services/subscriptionService');

const iso = (msFromNow) => new Date(Date.now() + msFromNow).toISOString();
const DAY = 24 * 60 * 60 * 1000;

function buildExamples(userId, email) {
  return {
    free: {
      status: 'free',
      plan: 'free',
    },
    trialing: {
      status: 'trialing',
      plan: 'premium',
      trialStart: iso(-2 * DAY),
      trialEnd: iso(5 * DAY),
      provider: 'dev',
      updatedAt: iso(-2 * DAY),
    },
    'active-monthly': {
      status: 'active',
      plan: 'premium-monthly',
      provider: 'hotmart',
      providerEventId: 'TRANS-MONTHLY-001',
      buyerEmail: email,
      subscriptionId: '87000123',
      nextBillingDate: iso(30 * DAY),
      renewing: false,
      updatedAt: iso(-1 * DAY),
    },
    'active-annual': {
      status: 'active',
      plan: 'premium-annual',
      provider: 'hotmart',
      providerEventId: 'TRANS-ANNUAL-001',
      buyerEmail: email,
      subscriptionId: '87000456',
      nextBillingDate: iso(365 * DAY),
      renewing: false,
      updatedAt: iso(-10 * DAY),
    },
    past_due: {
      status: 'past_due',
      plan: 'premium-monthly',
      provider: 'hotmart',
      providerEventId: 'TRANS-PASTDUE-001',
      buyerEmail: email,
      subscriptionId: '87000789',
      nextBillingDate: iso(-3 * DAY),
      renewing: true,
      updatedAt: iso(-3 * DAY),
    },
    canceled: {
      status: 'canceled',
      plan: 'premium-monthly',
      provider: 'hotmart',
      providerEventId: 'TRANS-CANCEL-001',
      buyerEmail: email,
      subscriptionId: '87000102',
      renewing: false,
      updatedAt: iso(-5 * DAY),
    },
    expired: {
      status: 'expired',
      plan: 'premium-monthly',
      provider: 'hotmart',
      providerEventId: 'TRANS-EXPIRED-001',
      buyerEmail: email,
      subscriptionId: '87000345',
      renewing: false,
      updatedAt: iso(-40 * DAY),
    },
  };
}

async function main() {
  const userId = process.argv[2] || 'demo-user';
  const email = process.env.SEED_EMAIL || 'demo@appingles.app';
  const examples = buildExamples(userId, email);

  console.log(`Seedeando 'subscriptions' para "${userId}" (STORE_MODE=${store.MODE})\n`);
  for (const [state, doc] of Object.entries(examples)) {
    const id = `${userId}__${state}`;
    await store.setDoc('subscriptions', id, doc);
    console.log(`  ✓ subscriptions/${id} -> ${state} (${doc.plan})`);
  }

  // Idempotencia (webhooks ya procesados) — como en producción.
  await store.setDoc('paymentEvents', userId, {
    userId,
    processedIds: ['TRANS-MONTHLY-001', 'TRANS-ANNUAL-001'],
  });
  console.log(`  ✓ paymentEvents/${userId} -> processedIds (idempotencia)`);

  // Índice email -> userId (resolución de webhook sin custom).
  await subscriptionService.linkEmailToUser(userId, email);
  console.log(`  ✓ userEmails/${email} -> { userId: "${userId}" }`);

  console.log('\nNota: para probar con trial real (sin tocar Firestore) usa:');
  console.log('  POST /api/subscription/activate  (dev)  o  node scripts/dev-unlock.js <userId>');
  console.log('\nHecho.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});