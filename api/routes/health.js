// routes/health.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'appingles-api',
    version: '0.1.0',
    time: new Date().toISOString(),
  });
});

module.exports = router;
