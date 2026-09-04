// tests/password-changed.test.js
// Flujo de contraseña asignada por un admin: GET /subscription/status expone
// mustChangePassword + isAdmin, y POST /auth/password-changed limpia el flag
// una vez el usuario ya creó su propia contraseña.

process.env.AUTH_MODE = 'dev';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const store = require('../lib/store');

const subscriptionRouter = require('../routes/subscription');
const authRouter = require('../routes/auth');

const U = 'pwchg-test-u1';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/subscription', subscriptionRouter);
  app.use('/api/auth', authRouter);
  return app;
}

async function withServer(run) {
  const app = buildApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    return await run(async (method, path, body, opts = {}) => {
      const headers = { 'Content-Type': 'application/json', 'X-Session-Id': 'pwchg' };
      if (opts.user) headers['X-Dev-User'] = opts.user;
      if (opts.admin) headers['X-Dev-Admin'] = '1';
      const res = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, data: await res.json().catch(() => ({})) };
    });
  } finally {
    server.close();
  }
}

async function cleanup() {
  await store.deleteDoc('subscriptions', U);
}

test.after(cleanup);

test('Subscription status: mustChangePassword refleja el flag del doc y no es admin por defecto', async () => {
  await cleanup();
  await store.setDoc('subscriptions', U, {
    plan: 'premium-lifetime',
    status: 'active',
    mustChangePassword: true,
    updatedAt: new Date().toISOString(),
  });
  await withServer(async (call) => {
    const res = await call('GET', '/api/subscription/status', null, { user: U });
    assert.equal(res.status, 200);
    assert.equal(res.data.mustChangePassword, true);
    assert.equal(res.data.isAdmin, false);
  });
});

test('Subscription status: isAdmin=true con X-Dev-Admin en modo dev', async () => {
  await withServer(async (call) => {
    const res = await call('GET', '/api/subscription/status', null, { user: U, admin: true });
    assert.equal(res.status, 200);
    assert.equal(res.data.isAdmin, true);
  });
});

test('POST /auth/password-changed limpia mustChangePassword', async () => {
  await cleanup();
  await store.setDoc('subscriptions', U, {
    plan: 'premium-lifetime',
    status: 'active',
    mustChangePassword: true,
    updatedAt: new Date().toISOString(),
  });
  await withServer(async (call) => {
    const cleared = await call('POST', '/api/auth/password-changed', {}, { user: U });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.data.ok, true);

    const sub = await store.getDoc('subscriptions', U);
    assert.equal(sub.mustChangePassword, false);

    const status = await call('GET', '/api/subscription/status', null, { user: U });
    assert.equal(status.data.mustChangePassword, false);
  });
});

test('POST /auth/password-changed es un no-op seguro si no había flag', async () => {
  await cleanup();
  await store.setDoc('subscriptions', U, { plan: 'reto21', status: 'active', updatedAt: new Date().toISOString() });
  await withServer(async (call) => {
    const res = await call('POST', '/api/auth/password-changed', {}, { user: U });
    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);
  });
});
