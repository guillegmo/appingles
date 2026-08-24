// tests/hotmart-activation.test.js
// Flujo COMPRA EXTERNA → USUARIO → ACCESO → EMAIL DE ACTIVACIÓN.
// Cubre: compra aprobada, duplicado, usuario existente, reembolso, chargeback,
// firma del webhook, gate de acceso (status) y reenvío con cooldown.
// La activación real de contraseña + login se cubren en E2E (Playwright).

process.env.AUTH_MODE = 'dev';
delete process.env.HOTMART_WEBHOOK_SECRET;
delete process.env.MAIL_HOST;

const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../lib/store');
const processor = require('../services/hotmartProcessor');
const hotmart = require('../services/payments/hotmart');

// ---- Store en memoria (mismo patrón que auth-session.test.js) ----
function setupStore() {
  const db = new Map();
  const orig = {
    getDoc: store.getDoc,
    setDoc: store.setDoc,
    queryDocs: store.queryDocs,
    updateDoc: store.updateDoc,
  };
  store.getDoc = async (col, id) => db.get(`${col}/${id}`) || null;
  store.setDoc = async (col, id, data) => {
    db.set(`${col}/${id}`, { ...(db.get(`${col}/${id}`) || {}), ...data });
    return { id, ...data };
  };
  store.updateDoc = async (col, id, patch) => {
    db.set(`${col}/${id}`, { ...(db.get(`${col}/${id}`) || {}), ...patch });
    return { id, ...patch };
  };
  store.queryDocs = async (col, opts = {}) => {
    let docs = [...db.entries()]
      .filter(([k]) => k.startsWith(`${col}/`))
      .map(([k, v]) => ({ id: k.slice(col.length + 1), ...v }));
    for (const f of opts.filters || []) {
      docs =
        f.op === '!=' ? docs.filter((d) => d[f.field] != f.value) : docs.filter((d) => d[f.field] == f.value);
    }
    if (opts.orderBy) {
      const dir = opts.orderBy.direction === 'desc' ? -1 : 1;
      docs.sort((a, b) => (a[opts.orderBy.field] > b[opts.orderBy.field] ? dir : -dir));
    }
    return opts.limit ? docs.slice(0, opts.limit) : docs;
  };
  return {
    db,
    count(col) {
      return [...db.keys()].filter((k) => k.startsWith(`${col}/`)).length;
    },
    restore() {
      Object.assign(store, orig);
    },
  };
}

let EMAIL_SEQ = 0;
function retoPurchase({ email, tx }) {
  return {
    event: 'PURCHASE_APPROVED',
    data: {
      buyer: { email, name: 'Comprador Test' },
      product: { id: '900001', name: 'Reto de Inglés en 21 Días' },
      purchase: { transaction: tx, status: 'approved', recurrency_number: 1 },
    },
  };
}

test('TEST 1 — compra aprobada crea usuario, activa acceso y genera email de activación', async () => {
  const s = setupStore();
  try {
    const email = `buyer${++EMAIL_SEQ}@example.com`;
    const res = await processor.processHotmartEvent(retoPurchase({ email, tx: `T1-${EMAIL_SEQ}` }));

    assert.equal(res.ok, true);
    assert.equal(res.applied, true);
    assert.equal(res.created, true);
    assert.equal(res.subscription.status, 'active');
    assert.equal(res.subscription.plan, 'reto21');

    // Usuario creado con uid determinista + índice de email.
    assert.ok(s.db.has(`userEmails/${email}`));
    // Email de activación registrado en dry-run con enlace a la página oficial.
    const outbox = await store.queryDocs('mailOutbox', { filters: [{ field: 'to', op: '==', value: email }] });
    assert.equal(outbox.length, 1);
    assert.match(outbox[0].link, /\/appingles\/activar/);
    // Registro global de eventos procesados.
    const events = await store.queryDocs('hotmartEvents', {});
    assert.equal(events.filter((e) => e.transactionId === `T1-${EMAIL_SEQ}`).length, 1);
  } finally {
    s.restore();
  }
});

test('TEST 2 — webhook duplicado no duplica usuario, acceso ni email', async () => {
  const s = setupStore();
  try {
    const email = `dup${++EMAIL_SEQ}@example.com`;
    const payload = retoPurchase({ email, tx: `T2-${EMAIL_SEQ}` });

    const first = await processor.processHotmartEvent(payload);
    assert.equal(first.applied, true);

    const second = await processor.processHotmartEvent(payload);
    assert.equal(second.ok, true);
    assert.equal(second.duplicate, true);

    const outbox = await store.queryDocs('mailOutbox', { filters: [{ field: 'to', op: '==', value: email }] });
    assert.equal(outbox.length, 1, 'un solo email de activación');
    const usersWithEmail = await store.queryDocs('userEmails', { filters: [{ field: 'userId', op: '!=', value: '' }] });
    assert.equal(usersWithEmail.filter((u) => u.userId?.startsWith('hm_')).length >= 1, true);
    const users = await store.getDoc('userEmails', email);
    assert.ok(users); // un único índice email→uid
  } finally {
    s.restore();
  }
});

test('TEST 3 — usuario existente: reutiliza el UID y activa su acceso', async () => {
  const s = setupStore();
  try {
    const email = `existente${++EMAIL_SEQ}@example.com`;
    await store.setDoc('userEmails', email, { userId: 'uid_existente', email });
    await store.setDoc('users', 'uid_existente', { name: 'Ya registrado', email });
    await store.setDoc('subscriptions', 'uid_existente', { status: 'free', plan: 'free' });

    const res = await processor.processHotmartEvent(retoPurchase({ email, tx: `T3-${EMAIL_SEQ}` }));
    assert.equal(res.applied, true);
    assert.equal(res.created, false);
    const sub = await store.getDoc('subscriptions', 'uid_existente');
    assert.equal(sub.status, 'active');
    assert.equal(sub.plan, 'reto21'); // mismo uid, acceso actualizado sin borrar nada
  } finally {
    s.restore();
  }
});

test('TEST 4 — reembolso revoca el acceso (expired) sin borrar al usuario', async () => {
  const s = setupStore();
  try {
    const email = `refund${++EMAIL_SEQ}@example.com`;
    const tx = `T4-${EMAIL_SEQ}`;
    await processor.processHotmartEvent(retoPurchase({ email, tx }));
    const uid = (await store.getDoc('userEmails', email)).userId;

    const res = await processor.processHotmartEvent({
      event: 'PURCHASE_REFUNDED',
      data: {
        buyer: { email },
        product: { id: '900001', name: 'Reto de Inglés en 21 Días' },
        purchase: { transaction: `${tx}-R`, status: 'refunded' },
      },
    });
    assert.equal(res.applied, true);
    const sub = await store.getDoc('subscriptions', uid);
    assert.equal(sub.status, 'expired');
    assert.ok(await store.getDoc('users', uid), 'el usuario NO se elimina');
  } finally {
    s.restore();
  }
});

test('TEST 5 — chargeback revoca el acceso', async () => {
  const s = setupStore();
  try {
    const email = `cb${++EMAIL_SEQ}@example.com`;
    const tx = `T5-${EMAIL_SEQ}`;
    await processor.processHotmartEvent(retoPurchase({ email, tx }));
    const uid = (await store.getDoc('userEmails', email)).userId;

    assert.equal(hotmart.normalizeStatus('PURCHASE_CHARGEBACK'), 'expired');
    const res = await processor.processHotmartEvent({
      event: 'PURCHASE_CHARGEBACK',
      data: {
        buyer: { email },
        product: { id: '900001', name: 'Reto de Inglés en 21 Días' },
        purchase: { transaction: `${tx}-CB`, status: 'chargeback' },
      },
    });
    assert.equal(res.applied, true);
    const sub = await store.getDoc('subscriptions', uid);
    assert.equal(sub.status, 'expired');
  } finally {
    s.restore();
  }
});

test('Firma del webhook: válida con HMAC correcto, rechazada si no coincide', () => {
  const crypto = require('crypto');
  const secret = 'secreto-de-prueba';
  process.env.HOTMART_WEBHOOK_SECRET = secret;
  try {
    const rawBody = JSON.stringify({ event: 'PURCHASE_APPROVED', data: {} });
    const good = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    assert.deepEqual(hotmart.verifyWebhook({ headers: { 'x-hotmart-signature': good }, rawBody }).valid, true);
    assert.equal(hotmart.verifyWebhook({ headers: { 'x-hotmart-signature': 'deadbeef' }, rawBody }).valid, false);
    assert.equal(hotmart.verifyWebhook({ headers: {}, rawBody }).valid, false);
  } finally {
    delete process.env.HOTMART_WEBHOOK_SECRET;
  }
});

test('TEST 8 — usuario sin compra activa: hasAccess=false en /access/status', async () => {
  const s = setupStore();
  try {
    const express = require('express');
    const accessRouter = require('../routes/access');
    const app = express();
    app.use(express.json());
    app.use('/api/access', accessRouter);
    const server = app.listen(0);
    const port = server.address().port;
    try {
      const call = async (path, user) => {
        const res = await fetch(`http://127.0.0.1:${port}/api/access${path}`, {
          headers: { 'X-Dev-User': user },
        });
        return { status: res.status, data: await res.json() };
      };

      // Sin documento de suscripción → free → sin acceso.
      const noAccess = await call('/status', 'u_sin_compra');
      assert.equal(noAccess.data.hasAccess, false);
      assert.equal(noAccess.data.status, 'free');

      // Con suscripción activa → acceso.
      await store.setDoc('subscriptions', 'u_comprador', { status: 'active', plan: 'reto21' });
      const withAccess = await call('/status', 'u_comprador');
      assert.equal(withAccess.data.hasAccess, true);
    } finally {
      server.close();
    }
  } finally {
    s.restore();
  }
});

test('TEST 10 — reenvío de enlace: envía una vez, aplica cooldown y exige compra', async () => {
  const s = setupStore();
  try {
    const email = `reenvio${++EMAIL_SEQ}@example.com`;

    // Sin compra registrada → no envía.
    const none = await processor.resendActivationForEmail(email);
    assert.equal(none.sent, false);

    // Con compra activa → envía; segundo intento inmediato → cooldown.
    await processor.processHotmartEvent(retoPurchase({ email, tx: `T10-${EMAIL_SEQ}` }));
    const first = await processor.resendActivationForEmail(email);
    assert.equal(first.sent, false); // dry-run transport ≠ smtp, pero sí registra
    const afterFirst = await store.queryDocs('mailOutbox', { filters: [{ field: 'to', op: '==', value: email }] });
    const resendEntries = afterFirst.filter((m) => m.note !== 'smtp_fallback').length;
    assert.ok(resendEntries >= 2, 'email original + reenvío registrados');

    const second = await processor.resendActivationForEmail(email);
    assert.equal(second.reason, 'cooldown');
    const afterSecond = await store.queryDocs('mailOutbox', { filters: [{ field: 'to', op: '==', value: email }] });
    assert.equal(afterSecond.length, resendEntries, 'cooldown evita un nuevo envío');
  } finally {
    s.restore();
  }
});
