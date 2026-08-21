const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../lib/store');

const COL = 'storetest_helpers';

test.after(async () => {
  await store.deleteDoc(COL, 'a');
  await store.deleteDoc(COL, 'b');
  await store.deleteDoc(COL, 'c');
  await store.deleteDoc(COL, 'd');
  await store.deleteDoc(COL, 'e');
});

test('getDocs devuelve solo los documentos pedidos (en lote)', async () => {
  await store.setDoc(COL, 'a', { name: 'Ana' });
  await store.setDoc(COL, 'b', { name: 'Ben' });
  await store.setDoc(COL, 'c', { name: 'Caro' });

  const docs = await store.getDocs(COL, ['a', 'c', 'noexiste']);
  const byId = Object.fromEntries(docs.map((d) => [d.id, d]));
  assert.deepEqual(Object.keys(byId).sort(), ['a', 'c']);
  assert.equal(byId.a.name, 'Ana');
  assert.equal(byId.c.name, 'Caro');
});

test('getDocs con lista vacía no hace nada', async () => {
  const docs = await store.getDocs(COL, []);
  assert.deepEqual(docs, []);
});

test('batchWrite escribe en un solo lote (set con merge)', async () => {
  await store.setDoc(COL, 'd', { count: 1 });
  await store.batchWrite([
    { collection: COL, id: 'd', data: { count: 2, extra: true } },
    { collection: COL, id: 'e', data: { name: 'Dani' } },
  ]);

  const d = await store.getDoc(COL, 'd');
  const e = await store.getDoc(COL, 'e');
  assert.equal(d.count, 2);
  assert.equal(d.extra, true);
  assert.equal(e.name, 'Dani');
});

test('batchWrite con type update solo pisa los campos indicados', async () => {
  await store.setDoc(COL, 'e', { name: 'Dani', kept: 'si' });
  await store.batchWrite([{ type: 'update', collection: COL, id: 'e', data: { name: 'Daniel' } }]);

  const e = await store.getDoc(COL, 'e');
  assert.equal(e.name, 'Daniel');
  assert.equal(e.kept, 'si');
});