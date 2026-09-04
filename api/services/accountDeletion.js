// services/accountDeletion.js
// Fuente única de qué colecciones/documentos pertenecen a un usuario, para no
// divergir entre el borrado de datos autoservicio (routes/privacy.js, GDPR
// "derecho al olvido") y el borrado de cuenta completa desde el panel de
// admin (routes/admin.js) — ambos deben borrar exactamente lo mismo.

const store = require('../lib/store');

// Colecciones cuyo id es (o contiene) el userId. Las de contenido global se omiten.
const USER_COLLECTIONS = [
  'progress',
  'streaks',
  'badges',
  'profiles',
  'learningPlans',
  'recommendations',
  'subscriptions',
  'payments',
  'paymentEvents',
  'users',
  'userEmails',
  'exerciseAttempts',
  'speakingSessions',
  'pronunciationScores',
  'reviewCards',
  'reviewResults',
  'conversations',
  'aiUsage',
  'analyticsEvents',
  'seasonClaims',
  'savedPhrases',
  'vocabulary',
];

function docBelongsToUser(docId, userId) {
  if (docId === userId) return true;
  return String(docId).startsWith(`${userId}_`);
}

async function allDocsOfUser(userId) {
  const out = {};
  const prefixStart = userId;
  const prefixEnd = userId + '￿';
  for (const coll of USER_COLLECTIONS) {
    try {
      const docs = await store.queryDocs(coll, {
        filters: [
          { field: '__name__', op: '>=', value: prefixStart },
          { field: '__name__', op: '<', value: prefixEnd },
        ],
      });
      if (docs.length) out[coll] = docs;
    } catch (e) {
      // fallback to old method for safety
      const docs = (await store.listDocs(coll)).filter((d) => docBelongsToUser(d.id, userId));
      if (docs.length) out[coll] = docs;
    }
  }
  return out;
}

// Borra todos los documentos de todas las colecciones de USER_COLLECTIONS que
// pertenezcan a userId. NO borra la cuenta de Firebase Auth (eso es un paso
// aparte, ver services/provisioning.js:deleteAuthUser) — este helper solo
// limpia Firestore. Devuelve cuántos documentos se borraron en total.
async function deleteAllUserData(userId) {
  const prefixStart = userId;
  const prefixEnd = userId + '￿';
  let deleted = 0;
  for (const coll of USER_COLLECTIONS) {
    try {
      const docs = await store.queryDocs(coll, {
        filters: [
          { field: '__name__', op: '>=', value: prefixStart },
          { field: '__name__', op: '<', value: prefixEnd },
        ],
      });
      for (const d of docs) {
        await store.deleteDoc(coll, d.id);
        deleted += 1;
      }
    } catch (e) {
      // fallback
      const docs = await store.listDocs(coll);
      for (const d of docs) {
        if (docBelongsToUser(d.id, userId)) {
          await store.deleteDoc(coll, d.id);
          deleted += 1;
        }
      }
    }
  }
  return deleted;
}

module.exports = { USER_COLLECTIONS, docBelongsToUser, allDocsOfUser, deleteAllUserData };
