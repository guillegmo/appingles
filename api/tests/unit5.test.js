const test = require('node:test');
const assert = require('node:assert/strict');
const srs = require('../services/srs');
const contentGenerator = require('../services/contentGenerator');

const TODAY = new Date('2026-08-14T12:00:00Z');

test('SRS: primer acierto programa 1 día', () => {
  const next = srs.schedule({}, 4, TODAY);
  assert.equal(next.repetitions, 1);
  assert.equal(next.intervalDays, 1);
  assert.equal(next.dueDate, '2026-08-15');
});

test('SRS: segundo acierto programa 2 días', () => {
  const next = srs.schedule({ repetitions: 1, intervalDays: 1, easeFactor: 2.5 }, 4, TODAY);
  assert.equal(next.repetitions, 2);
  assert.equal(next.intervalDays, 2);
});

test('SRS: fallo resetea repeticiones y revísala mañana', () => {
  const next = srs.schedule({ repetitions: 3, intervalDays: 7, easeFactor: 2.5 }, 0, TODAY);
  assert.equal(next.repetitions, 0);
  assert.equal(next.intervalDays, 1);
  assert.equal(next.dueDate, '2026-08-15');
  assert.ok(next.easeFactor < 2.5);
});

test('SRS: intervalo crece con repeticiones', () => {
  let card = { repetitions: 2, intervalDays: 3, easeFactor: 2.5 };
  card = srs.schedule(card, 4, TODAY);
  assert.equal(card.intervalDays, 4);
  card = srs.schedule(card, 4, TODAY);
  assert.ok(card.intervalDays > 4);
});

test('SRS: dueCards solo incluye las que toca hoy', () => {
  const cards = [
    { dueDate: '2026-08-13' },
    { dueDate: '2026-08-14' },
    { dueDate: '2026-08-15' },
    { dueDate: '2026-08-16' },
  ];
  const due = srs.dueCards(cards, TODAY);
  assert.equal(due.length, 2);
});

test('Generator: parseJsonResponse limpia markdown', () => {
  const raw = '```json\n{"id":"gen-1","title":"Hi"}\n```';
  const parsed = contentGenerator.parseJsonResponse(raw);
  assert.equal(parsed.id, 'gen-1');
});

test('Generator: parseJsonResponse rechaza sin JSON', () => {
  assert.throws(() => contentGenerator.parseJsonResponse('no hay json'));
});

test('Generator: generateLesson crea draft con mock', async () => {
  const original = require('../lib/store');
  const storeMock = {
    getDoc: async () => null,
    setDoc: async (c, id, data) => data,
    listDocs: async () => [],
    updateDoc: async () => ({}),
    queryDocs: async (col, options = {}) => {
      return [];
    },
  };
  const libStore = require('../lib/store');
  const originalFns = { ...libStore };
  for (const k of Object.keys(storeMock)) libStore[k] = storeMock[k];

  const result = await contentGenerator.generateLesson({ skill: 'vocabulary', situation: 'travel', topic: 'Packing' });
  assert.ok(result.id);
  assert.equal(result.lesson.status, 'draft');
  assert.equal(result.lesson.generatedBy, 'ai');
  assert.ok(Array.isArray(result.lesson.vocabulary));
  assert.ok(result.lesson.mock === true);

  for (const k of Object.keys(originalFns)) libStore[k] = originalFns[k];
});
