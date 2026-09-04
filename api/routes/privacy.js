// routes/privacy.js
// Privacidad / GDPR: exportación y eliminación de datos del usuario.

const express = require('express');
const router = express.Router();
const { allDocsOfUser, deleteAllUserData } = require('../services/accountDeletion');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

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
  await deleteAllUserData(req.user.id);
  res.json({ ok: true, message: 'Datos eliminados' });
});

module.exports = router;
