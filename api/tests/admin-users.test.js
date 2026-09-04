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
const U3 = 'admin-test-u3-delete';

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
    ['subscriptions', U3],
    ['progress', U3],
    ['vocabulary', U3],
    ['users', U3],
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

    const del = await call('DELETE', `/api/admin/users/${U1}`, null, { user: 'someone' });
    assert.equal(del.status, 403);

    const create = await call('POST', '/api/admin/users', { email: 'nuevo@example.com', password: 'Segura#123' }, { user: 'someone' });
    assert.equal(create.status, 403);
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

test('Admin: DELETE /admin/users/:id no permite borrar la propia cuenta', async () => {
  await withServer(async (call) => {
    const res = await call('DELETE', '/api/admin/users/admin', null, { user: 'admin', admin: true });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'no_puedes_borrar_tu_propia_cuenta');
  });
});

test('Admin: DELETE /admin/users/:id borra todos los datos del usuario en todas las colecciones', async () => {
  await store.setDoc('subscriptions', U3, {
    buyerEmail: 'delete-me@example.com',
    buyerName: 'Para Borrar',
    plan: 'reto21',
    status: 'active',
    updatedAt: new Date().toISOString(),
  });
  await store.setDoc('progress', U3, { completedDays: [1], practiceDays: [], totalXp: 10 });
  await store.setDoc('vocabulary', U3, { items: [{ en: 'hello', es: 'hola' }] });
  await store.setDoc('users', U3, { name: 'Para Borrar', email: 'delete-me@example.com' });

  await withServer(async (call) => {
    const res = await call('DELETE', `/api/admin/users/${U3}`, null, { user: 'admin', admin: true });
    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);
    assert.ok(res.data.deletedDocs >= 4, `debe borrar al menos las 4 colecciones sembradas (borró ${res.data.deletedDocs})`);
    // Sin Firebase real en tests -> deleteAuthUser es un no-op que no lanza.
    assert.equal(res.data.authDeleted, true);

    assert.equal(await store.getDoc('subscriptions', U3), null);
    assert.equal(await store.getDoc('progress', U3), null);
    assert.equal(await store.getDoc('vocabulary', U3), null);
    assert.equal(await store.getDoc('users', U3), null);
  });
});

test('Admin: POST /admin/users valida correo y contraseña', async () => {
  await withServer(async (call) => {
    const badEmail = await call('POST', '/api/admin/users', { email: 'no-es-correo', password: 'Segura#123' }, { user: 'admin', admin: true });
    assert.equal(badEmail.status, 400);
    assert.equal(badEmail.data.error, 'email_invalido');

    const badPassword = await call('POST', '/api/admin/users', { email: 'nuevo-usuario@example.com', password: 'debil' }, { user: 'admin', admin: true });
    assert.equal(badPassword.status, 400);
    assert.equal(badPassword.data.error, 'password_invalida');
  });
});

test('Admin: POST /admin/users crea la cuenta con acceso activo y mustChangePassword', async () => {
  const email = 'nuevo-usuario-creado@example.com';
  let newUserId;
  try {
    await withServer(async (call) => {
      const res = await call(
        'POST',
        '/api/admin/users',
        { email, name: 'Usuario Nuevo', plan: 'reto21', password: 'Segura#123' },
        { user: 'admin', admin: true },
      );
      assert.equal(res.status, 201);
      assert.equal(res.data.ok, true);
      assert.equal(res.data.user.email, email);
      assert.equal(res.data.user.plan, 'reto21');
      assert.equal(res.data.user.active, true);
      newUserId = res.data.user.userId;

      const sub = await store.getDoc('subscriptions', newUserId);
      assert.equal(sub.status, 'active');
      assert.equal(sub.mustChangePassword, true, 'el admin asignó la contraseña -> debe forzar el cambio');

      // Repetir con el mismo correo debe fallar: ya existe.
      const dup = await call(
        'POST',
        '/api/admin/users',
        { email, password: 'OtraSegura#123' },
        { user: 'admin', admin: true },
      );
      assert.equal(dup.status, 409);
      assert.equal(dup.data.error, 'usuario_ya_existe');
    });
  } finally {
    if (newUserId) {
      await store.deleteDoc('subscriptions', newUserId);
      await store.deleteDoc('users', newUserId);
    }
  }
});
