// scripts/grant-access.js
// Concede acceso al producto (plan activo) a un usuario existente identificado
// por email. Útil para: el usuario premium de referencia, soporte manual, o
// migrar cuentas que compraron fuera del flujo del webhook.
//
// Uso:
//   node scripts/grant-access.js <email> [plan]
//   plan: reto21 (default) | premium | premium-monthly | premium-annual
//
// Requiere credenciales Firebase (STORE_MODE=firebase o GOOGLE_APPLICATION_
// CREDENTIALS). En modo file crea/actualiza el doc local.

require('dotenv').config();
const store = require('../lib/store');
const { invalidateSubscriptionCache } = require('../middleware/auth');

async function main() {
  const [email, plan = 'reto21'] = process.argv.slice(2);
  if (!email || !email.includes('@')) {
    console.error('Uso: node scripts/grant-access.js <email> [plan=reto21|premium|premium-monthly|premium-annual]');
    process.exit(1);
  }

  // Resolver uid: índice userEmails → Firebase Admin por email.
  let userId = (await store.getDoc('userEmails', email.toLowerCase()))?.userId || null;
  if (!userId && store.MODE === 'firebase') {
    try {
      store.initFirebase();
      const { getAuth } = require('firebase-admin/auth');
      userId = (await getAuth().getUserByEmail(email.toLowerCase())).uid;
    } catch {
      // sin usuario en Auth
    }
  }
  if (!userId) {
    console.error(`No se encontró usuario para ${email}. Debe existir en Firebase Auth y haber iniciado sesión alguna vez.`);
    process.exit(1);
  }

  await store.setDoc('subscriptions', userId, {
    status: 'active',
    plan,
    provider: 'manual-grant',
    updatedAt: new Date().toISOString(),
  });
  invalidateSubscriptionCache(userId);
  console.log(`✓ Acceso concedido: ${email} (${userId}) → plan=${plan} status=active`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
