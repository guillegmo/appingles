// tests/auth-session.test.js
// Sesión única: verifica POST /auth/session (flag replaced) y DELETE /auth/session
// (borrado condicional) montando el router con AUTH_MODE=dev y un store stub.

process.env.AUTH_MODE = 'dev';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const store = require('../lib/store');
const authRouter = require('../routes/auth');

function setup(sessions = {}) {
  const doc = sessions;
  const origGet = store.getDoc;
  const origSet = store.setDoc;
  store.getDoc = async (col, id) => (col === 'sessions' ? doc[id] || null : null);
  store.setDoc = async (col, id, val) => {
    if (col === 'sessions') doc[id] = val;
    return { ok: true };
  };

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  const server = app.listen(0);
  const port = server.address().port;

  const call = async (method, path, body, user = 'u1') => {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Dev-User': user },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };

  return {
    server,
    call,
    doc,
    close: () => {
      server.close();
      store.getDoc = origGet;
      store.setDoc = origSet;
    },
  };
}

test('POST /auth/session registra sesión y replaced=false la primera vez', async () => {
  const s = setup();
  const r = await s.call('POST', '/session', { sessionId: 'a' });
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
  assert.equal(r.data.replaced, false);
  assert.equal(s.doc.u1.activeSessionId, 'a');
  s.close();
});

test('POST /auth/session marca replaced=true cuando cambia de dispositivo', async () => {
  const s = setup({ u1: { activeSessionId: 'a' } });
  const r = await s.call('POST', '/session', { sessionId: 'b' });
  assert.equal(r.data.replaced, true);
  assert.equal(s.doc.u1.activeSessionId, 'b');
  s.close();
});

test('POST /auth/session no marca replaced con el mismo sessionId', async () => {
  const s = setup({ u1: { activeSessionId: 'a' } });
  const r = await s.call('POST', '/session', { sessionId: 'a' });
  assert.equal(r.data.replaced, false);
  assert.equal(s.doc.u1.activeSessionId, 'a');
  s.close();
});

test('DELETE /auth/session solo borra si el sessionId coincide', async () => {
  const s = setup({ u1: { activeSessionId: 'a' } });
  let r = await s.call('DELETE', '/session', { sessionId: 'wrong' });
  assert.equal(r.status, 200);
  assert.equal(s.doc.u1.activeSessionId, 'a');
  r = await s.call('DELETE', '/session', { sessionId: 'a' });
  assert.equal(r.status, 200);
  assert.equal(s.doc.u1.activeSessionId, null);
  s.close();
});

test('DELETE /auth/session exige sessionId', async () => {
  const s = setup({});
  const r = await s.call('DELETE', '/session', {});
  assert.equal(r.status, 400);
  s.close();
});