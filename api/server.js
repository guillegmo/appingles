// server.js
// AppIngles API — V1 MVP
// Inicio: npm start (requiere: node >= 20, .env opcional en modo dev)

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// =============================
// MIDDLEWARE GLOBAL
// =============================

app.use(cors({ origin: CORS_ORIGIN.split(','), credentials: true }));

// Captura el raw body (necesario para verificar firmas de webhook).
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); },
}));

// Rate limiting básico (OWASP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// =============================
// RUTAS
// =============================

app.use('/', require('./routes/health'));
app.use('/api/challenge', require('./routes/challenge'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/practice', require('./routes/practice'));
app.use('/api/content', require('./routes/content'));
app.use('/api/report', require('./routes/report'));
app.use('/api/review', require('./routes/review'));
app.use('/api/seasons', require('./routes/seasons'));
app.use('/api/privacy', require('./routes/privacy'));
app.use('/api/tutor', require('./routes/tutor'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin', require('./routes/admin'));
app.use('/webhooks', require('./routes/webhooks'));

// =============================
// 404 + ERROR HANDLER
// =============================

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('ERROR:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
===================================
🚀 AppIngles API iniciada
🌐 Puerto: ${PORT}
💾 Store: ${process.env.STORE_MODE || 'file'} (dev)
===================================
`);
});
