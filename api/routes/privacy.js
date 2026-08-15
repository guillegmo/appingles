// routes/privacy.js
// Privacidad / GDPR: exportación y eliminación de datos del usuario.

const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

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
  'exerciseAttempts',
  'speakingSessions',
  'reviewCards',
  'reviewResults',
  'conversations',
  'aiUsage',
  'analyticsEvents',
  'seasonClaims',
  'savedPhrases',
];

function docBelongsToUser(docId, userId) {
  if (docId === userId) return true;
  return String(docId).startsWith(`${userId}_`);
}

async function allDocsOfUser(userId) {
  const out = {};
  for (const coll of USER_COLLECTIONS) {
    const docs = (await store.listDocs(coll)).filter((d) => docBelongsToUser(d.id, userId));
    if (docs.length) out[coll] = docs;
  }
  return out;
}

// GET /privacy/data/export -> paquete JSON con los datos del usuario
router.get('/data/export', async (req, res) => {
  const data = await allDocsOfUser(req.user.id);
  res.json({
    exportedAt: new Date().toISOString(),
    userId: req.user.id,
    data,
  });
});

// DELETE /privacy/data -> elimina todos los datos del usuario (GDPR "derecho al olvido")
router.delete('/data', async (req, res) => {
  for (const coll of USER_COLLECTIONS) {
    const docs = await store.listDocs(coll);
    for (const d of docs) {
      if (docBelongsToUser(d.id, req.user.id)) {
        await store.deleteDoc(coll, d.id);
      }
    }
  }
  res.json({ ok: true, message: 'Datos eliminados' });
});

module.exports = router;
