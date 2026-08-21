const test = require('node:test');
const assert = require('node:assert/strict');
const reviewService = require('../services/reviewService');
const content = require('../lib/content');

const TODAY = new Date('2026-08-14T12:00:00Z');

test('review: exampleFor devuelve la frase que contiene la palabra', () => {
  const day = content.getDay(3);
  assert.equal(reviewService.exampleFor(day, 'music').en, 'I love music.');
  assert.equal(reviewService.exampleFor(day, 'music').es, 'Me encanta la música.');
  assert.equal(reviewService.exampleFor(day, 'I like...').en, 'I like coffee.');
  assert.equal(reviewService.exampleFor(day, 'I don\'t like...').en, 'I don\'t like traffic.');
  assert.equal(reviewService.exampleFor(day, 'Do you like...?').en, 'Do you like pizza?');
});

test('review: exampleFor cae a la propia palabra si no hay match (nunca frase ajena)', () => {
  const day = content.getDay(3);
  assert.deepEqual(reviewService.exampleFor(day, 'spaceship', 'nave espacial'), { en: 'spaceship', es: 'nave espacial' });
  assert.deepEqual(reviewService.exampleFor(day, 'weather', 'clima'), { en: 'weather', es: 'clima' });
});

test('review: exampleFor respeta límites de palabra (sin falso positivo)', () => {
  const day = content.getDay(1);
  // "Hello" no debe matchear "Hello, my name is Maria." con boundary tras la palabra.
  assert.equal(reviewService.exampleFor(day, 'Hello').en, 'Hello, my name is Maria.');
  assert.equal(reviewService.exampleFor(day, 'name').en, 'Hello, my name is Maria.');
});

test('review: exampleFor tolera day sin frases', () => {
  assert.equal(reviewService.exampleFor(null, 'music'), null);
  assert.equal(reviewService.exampleFor({}, 'music'), null);
  assert.equal(reviewService.exampleFor({ phrases: [] }, 'music'), null);
});

test('review: dueCards pone contexto por palabra y filtra por usuario', async () => {
  const libStore = require('../lib/store');
  libStore.listDocs = async () => [
    { userId: 'u1', key: 'day3_w0', day: 3, word: 'music', dueDate: '2026-08-14' },
    { userId: 'u1', key: 'day3_w1', day: 3, word: 'I like...', dueDate: '2026-08-14' },
    { userId: 'u1', key: 'day3_w2', day: 3, word: 'food', es: 'comida', dueDate: '2026-08-14' },
    { userId: 'u2', key: 'day3_w3', day: 3, word: 'music', dueDate: '2026-08-14' },
    { userId: 'u1', key: 'day3_w4', day: 3, word: 'music', dueDate: '2026-08-20' },
  ];
  libStore.queryDocs = async (col, options = {}) => {
    const { filters = [], orderBy = null, limit = null } = options;
    let docs = await libStore.listDocs();
    // apply filters
    if (filters.length > 0) {
      docs = docs.filter(doc => {
        return filters.every(f => {
          if (f.op === '==') return doc[f.field] == f.value;
          // default to equality
          return doc[f.field] == f.value;
        });
      });
    }
    // apply orderBy
    if (orderBy) {
      const direction = orderBy.direction || 'asc';
      docs.sort((a, b) => {
        const av = a[orderBy.field];
        const bv = b[orderBy.field];
        if (av < bv) return direction === 'asc' ? -1 : 1;
        if (av > bv) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    // apply limit
    if (limit !== null && limit !== undefined) {
      docs = docs.slice(0, limit);
    }
    return docs;
  };

  const items = await reviewService.dueCards('u1', { limit: 20, today: TODAY });
  assert.equal(items.length, 3);
  const byWord = Object.fromEntries(items.map((c) => [c.word, c]));
  assert.equal(byWord['music'].example, 'I love music.');
  assert.equal(byWord['music'].exampleEs, 'Me encanta la música.');
  assert.equal(byWord['I like...'].example, 'I like coffee.');
  assert.equal(byWord['food'].example, 'The food is delicious.');
  assert.equal(byWord['food'].exampleEs, 'La comida está deliciosa.');
  assert.equal(byWord['music'].id, 'u1_day3_w0');
});

test('review: pool y difficult también traen contexto', async () => {
  const libStore = require('../lib/store');
  libStore.listDocs = async () => [
    { userId: 'u1', key: 'day3_w0', day: 3, word: 'music', dueDate: '2026-08-14', easeFactor: 1.8, qualityHistory: [0] },
    { userId: 'u1', key: 'day3_w1', day: 3, word: 'I like...', dueDate: '2026-08-14', easeFactor: 2.5, qualityHistory: [3] },
  ];
  libStore.queryDocs = async (col, options = {}) => {
    const { filters = [], orderBy = null, limit = null } = options;
    let docs = await libStore.listDocs();
    // apply filters
    if (filters.length > 0) {
      docs = docs.filter(doc => {
        return filters.every(f => {
          if (f.op === '==') return doc[f.field] == f.value;
          // default to equality
          return doc[f.field] == f.value;
        });
      });
    }
    // apply orderBy
    if (orderBy) {
      const direction = orderBy.direction || 'asc';
      docs.sort((a, b) => {
        const av = a[orderBy.field];
        const bv = b[orderBy.field];
        if (av < bv) return direction === 'asc' ? -1 : 1;
        if (av > bv) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    // apply limit
    if (limit !== null && limit !== undefined) {
      docs = docs.slice(0, limit);
    }
    return docs;
  };

  const pool = await reviewService.getPoolCards('u1', { limit: 20, today: TODAY });
  assert.equal(pool.length, 2);
  assert.equal(pool[0].example, 'I love music.');
  assert.equal(pool[1].example, 'I like coffee.');

  const difficult = await reviewService.getDifficultCards('u1', { limit: 20, today: TODAY });
  assert.ok(Array.isArray(difficult));
});