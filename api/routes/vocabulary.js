// routes/vocabulary.js
// Banco de vocabulario IA (Premium IA): se arma automáticamente con las palabras
// que fallas en ejercicios. La captura es libre (POST), la visualización es premium.

const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const entitlement = require('../services/entitlement');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// POST /vocabulary/items — body: { words: [{ en, es }] }
// Guarda palabras nuevas (deduplicadas). Disponible para todos: así el banco
// se arma mientras el usuario avanza aunque aún no sea Premium.
// Transaccional: dos capturas simultáneas no pierden palabras.
router.post('/items', async (req, res) => {
  const { words } = req.body || {};
  const items = Array.isArray(words) ? words.filter((w) => w && String(w.en).trim()) : [];
  if (!items.length) return res.status(400).json({ error: 'words requerido (array de { en, es })' });

  const total = await store.runTransaction(async (tx) => {
    const doc = (await tx.get('vocabulary', req.user.id)) || { items: [] };
    const existing = new Set(doc.items.map((i) => String(i.en).toLowerCase()));
    for (const w of items) {
      const key = String(w.en).trim().toLowerCase();
      if (!existing.has(key)) {
        doc.items.push({ en: String(w.en).trim(), es: String(w.es || '').trim(), addedAt: new Date().toISOString() });
        existing.add(key);
      }
    }
    tx.set('vocabulary', req.user.id, doc);
    return doc.items.length;
  });

  res.json({ ok: true, total });
});

// GET /vocabulary — lista el banco (Premium IA)
router.get('/', async (req, res) => {
  const ent = entitlement.buildEntitlements(req.subscription);
  if (!ent.canUseVocabularyBank) {
    return res.status(403).json({ error: 'premium_required', message: 'El banco de vocabulario IA es parte de Premium IA.' });
  }
  const doc = (await store.getDoc('vocabulary', req.user.id)) || { items: [] };
  res.json({ items: doc.items, total: doc.items.length });
});

module.exports = router;