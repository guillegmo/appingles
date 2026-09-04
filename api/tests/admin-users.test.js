// tests/admin-users.test.js
// Panel de admin: listar usuarios, activar/inactivar acceso, asignar
// contraseña temporal. Protegido por requireAdmin (X-Dev-Admin en modo dev).

process.env.AUTH_MODE = 'dev';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const store = require('../lib/store');

const adminRouter = require('../routes/admin');

const U1 = 'admin-test-u1';
const U2 = 'admin-test-u2';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  return app;
}

async function withServer(run) {
  const app = buildApp();
  const server = app.listen(0);
  const port = server.address().port;
  try {
    return await run(async (method, path, body, opts = {}) => {
      const headers = { 'Content-Type': 'application/json' };
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
  for (const [col, id] of [
    ['subscriptions', U1],
    ['subscriptions', U2],
  ]) {
    await store.deleteDoc(col, id);
  }
}

test.before(async () => {
  await cleanup();
  await store.setDoc('subscriptions', U1, {
    buyerEmail: 'admin-test-u1@example.com',
    buyerName: 'Usuario Uno',
    plan: 'reto21',
    status: 'active',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
  await store.setDoc('subscriptions', U2, {
    buyerEmail: 'admin-test-u2@example.com',
    buyerName: 'Usuario Dos',
    plan: 'premium-lifetime',
    status: 'canceled',
    updatedAt: '2026-01-02T00:00:00.000Z',
  });
});

test.after(cleanup);

test('Admin: usuario normal (no admin) recibe 403 en todos los endpoints', async () => {
  await withServer(async (call) => {
    const list = await call('GET', '/api/admin/users', null, { user: 'someone' });
    assert.equal(list.status, 403);

    const status = await call('POST', `/api/admin/users/${U1}/status`, { status: 'canceled' }, { user: 'someone' });
    assert.equal(status.status, 403);

    const setPw = await call('POST', `/api/admin/users/${U1}/set-password`, { password: 'Segura#123' }, { user: 'someone' });
    assert.equal(setPw.status, 403);
  });
});

test('Admin: GET /admin/users lista usuarios con su estado efectivo', async () => {
  await withServer(async (call) => {
    const res = await call('GET', '/api/admin/users', null, { user: 'admin', admin: true });
    assert.equal(res.status, 200);
    const u1 = res.data.items.find((u) => u.userId === U1);
    const u2 = res.data.items.find((u) => u.userId === U2);
    assert.ok(u1, 'debe incluir al usuario activo');
    assert.equal(u1.active, true);
    assert.equal(u1.email, 'admin-test-u1@example.com');
    assert.ok(u2, 'debe incluir al usuario inactivo');
    assert.equal(u2.active, false);
  });
});

test('Admin: POST /admin/users/:id/status inactiva y reactiva el acceso', async () => {
  await withServer(async (call) => {
    const invalid = await call('POST', `/api/admin/users/${U1}/status`, { status: 'no-existe' }, { user: 'admin', admin: true });
    assert.equal(invalid.status, 400);

    const deactivate = await call('POST', `/api/admin/users/${U1}/status`, { status: 'canceled' }, { user: 'admin', admin: true });
    assert.equal(deactivate.status, 200);
    assert.equal(deactivate.data.subscription.status, 'canceled');
    const afterDeactivate = await store.getDoc('subscriptions', U1);
    assert.equal(afterDeactivate.status, 'canceled');

    const reactivate = await call('POST', `/api/admin/users/${U1}/status`, { status: 'active' }, { user: 'admin', admin: true });
    assert.equal(reactivate.status, 200);
    assert.equal(reactivate.data.subscription.status, 'active');
    const afterReactivate = await store.getDoc('subscriptions', U1);
    assert.equal(afterReactivate.status, 'active');
  });
});

test('Admin: POST /admin/users/:id/set-password rechaza contraseñas débiles', async () => {
  await withServer(async (call) => {
    const res = await call('POST', `/api/admin/users/${U1}/set-password`, { password: 'debil' }, { user: 'admin', admin: true });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'password_invalida');
    assert.ok(res.data.requirements.length > 0);
  });
});

test('Admin: POST /admin/users/:id/set-password asigna la contraseña y marca mustChangePassword', async () => {
  await withServer(async (call) => {
    const res = await call('POST', `/api/admin/users/${U1}/set-password`, { password: 'Segura#123' }, { user: 'admin', admin: true });
    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);
    const sub = await store.getDoc('subscriptions', U1);
    assert.equal(sub.mustChangePassword, true, 'debe forzar el cambio en el próximo login');
  });
});
