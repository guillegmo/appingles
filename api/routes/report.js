// routes/report.js
// Reporte semanal de progreso.

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { weeklyReport } = require('../services/report');

router.use(authenticate);

// GET /report/weekly
router.get('/weekly', async (req, res) => {
  try {
    const report = await weeklyReport(req.user.id);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'report_failed', message: err.message });
  }
});

module.exports = router;
