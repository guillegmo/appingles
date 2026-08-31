// server.js
// AppIngles API — V1 MVP
// Inicio: npm start (requiere: node >= 20, .env opcional en modo dev)

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Errores del backend (p.ej. cuota de Firestore agotada, red) NO deben tumbar
// el proceso entero: se registran y la petición afectada recibe 500.
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

const app = express();

// Render/proxy termina TLS y añade X-Forwarded-For: sin esto, req.ip es la IP
// del proxy y TODOS los usuarios compartirían el mismo bucket de rate limit.
app.set('trust proxy', 1);

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

// Rate limiting básico (OWASP). En desarrollo permitimos más margen para no
// bloquear el uso real (StrictMode duplica efectos + suites E2E). Configurable
// con RATE_LIMIT_MAX.
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || (process.env.NODE_ENV === 'production' ? 300 : 1000);
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// =============================
// RUTAS
// =============================

// Imágenes pedagógicas curadas (content/images/*.jpg), descargadas con el MCP
// StockImages en tiempo de autoría. Servidas como estáticos: sin llamadas a
// proveedores en runtime.
app.use('/api/images', express.static(path.resolve(__dirname, '../content/images')));

app.use('/', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/challenge', require('./routes/challenge'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/access', require('./routes/access'));
app.use('/api/practice', require('./routes/practice'));
app.use('/api/content', require('./routes/content'));
app.use('/api/report', require('./routes/report'));
app.use('/api/review', require('./routes/review'));
app.use('/api/seasons', require('./routes/seasons'));
app.use('/api/privacy', require('./routes/privacy'));
app.use('/api/vocabulary', require('./routes/vocabulary'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/tutor', require('./routes/tutor'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/memory', require('./routes/memory'));
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
