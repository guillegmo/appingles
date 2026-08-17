// scripts/dev-unlock.js
// DEV ONLY — desbloquea un usuario para probar features Premium IA.
// Uso: node scripts/dev-unlock.js <userId>
//  - Marca los 21 días completados (accede al contenido post-21).
//  - Activa una suscripción Premium IA (trial 30 días) para canGenerateLessons.
require('dotenv').config();
const store = require('../lib/store');
const subscriptionService = require('../services/subscriptionService');

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Uso: node scripts/dev-unlock.js <userId>');
    console.error('El userId es el uid de Firebase Auth (en la app: localStorage "appingles_user").');
    process.exit(1);
  }

  const completedDays = Array.from({ length: 21 }, (_, i) => i + 1);
  const progress = (await store.getDoc('progress', userId)) || {};
  await store.setDoc('progress', userId, {
    ...progress,
    completedDays,
  });

  const sub = await subscriptionService.activateTrial(userId, { plan: 'premium', trialDays: 30 });

  console.log(`✅ Reto 21 días completado y Premium activo para "${userId}"`);
  console.log(`   Estado: ${sub.status} · plan: ${sub.plan}`);
  console.log('Ahora abre la app y entra a: Aprendizaje continuo → Generar lección IA.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});