// scripts/delete-user.js
// Elimina un usuario de prueba de Firebase Auth y limpia su data en Firestore
// (users, subscriptions, userEmails, paymentEvents, hotmartEvents).
//
// Uso:
//   node scripts/delete-user.js <email>
// Requiere credenciales Firebase (STORE_MODE=firebase / GOOGLE_APPLICATION_CREDENTIALS).

require('dotenv').config();
const store = require('../lib/store');

const COLLECTIONS = ['users', 'subscriptions', 'userEmails', 'paymentEvents', 'hotmartEvents', 'activationRequests'];

async function main() {
  const email = process.argv[2];
  if (!email || !email.includes('@')) {
    console.error('Uso: node scripts/delete-user.js <email>');
    process.exit(1);
  }
  const normalized = email.trim().toLowerCase();

  // uid desde Firebase Admin o desde el índice.
  let userId = null;
  try {
    store.initFirebase();
    const { getAuth } = require('firebase-admin/auth');
    userId = (await getAuth().getUserByEmail(normalized)).uid;
    await getAuth().deleteUser(userId);
    console.log(`Auth: usuario eliminado (${userId})`);
  } catch (e) {
    if (e?.code === 'auth/user-not-found') {
      console.log('Auth: usuario no existía en Firebase Auth');
    } else {
      console.log(`Auth: no se pudo eliminar (${e?.message})`);
    }
  }

  if (!userId) {
    userId = (await store.getDoc('userEmails', normalized))?.userId || null;
  }

  // Limpieza Firestore por uid.
  if (userId) {
    for (const col of COLLECTIONS) {
      await store.deleteDoc(col, userId).catch(() => {});
    }
    console.log(`Firestore: limpiado por uid ${userId}`);
  }

  // Limpieza por email (userEmails usa email como key, y mailOutbox usa to).
  await store.deleteDoc('userEmails', normalized).catch(() => {});
  const outbox = await store.queryDocs('mailOutbox', { filters: [{ field: 'to', op: '==', value: normalized }] });
  for (const m of outbox) {
    await store.deleteDoc('mailOutbox', m.id).catch(() => {});
  }
  console.log(`Firestore: limpiado userEmails[${normalized}] y ${outbox.length} mailOutbox`);

  console.log('✓ Usuario de prueba eliminado.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
