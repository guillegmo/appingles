const test = require('node:test');
const assert = require('node:assert/strict');
const prompts = require('../services/prompts');
const aiClient = require('../services/aiClient');
const aiUsage = require('../services/aiUsage');

test('Prompts: existen los 8 modos', () => {
  assert.equal(Object.keys(prompts.MODES).length, 8);
  for (const m of Object.values(prompts.MODES)) {
    assert.ok(m.id && m.label && m.system);
  }
});

test('Prompts: buildSystemPrompt incluye nivel y debilidades', () => {
  const p = prompts.buildSystemPrompt('conversation', { level: 'beginner', weaknesses: ['speaking'], goal: 'viajar' });
  assert.match(p, /beginner/);
  assert.match(p, /speaking/);
  assert.match(p, /viajar/);
  assert.match(p, /≤3 frases/);
});

test('Prompts: modo desconocido cae en Conversation', () => {
  assert.equal(prompts.modeOf('nope').id, 'conversation');
  assert.equal(prompts.MODES['stuck'], undefined); // stuck es ruta separada
});

test('Prompts: stuck tiene su propio system', () => {
  assert.match(prompts.STUCK_PROMPT.system, /atascado/i);
});

test('AI client: mock dev devuelve respuesta y coste', () => {
  // Simula sin key: forzamos vía variable (el módulo la lee al cargar).
  // Como la key puede estar ausente/presente, verificamos ambas rutas de salida.
  const { chat, estimateCost } = aiClient;
  return chat([{ role: 'user', content: 'Hi' }]).then((r) => {
    assert.ok(typeof r.content === 'string' && r.content.length > 0);
    assert.ok(r.usage && r.usage.total_tokens > 0);
    const cost = estimateCost(r.usage);
    assert.ok(typeof cost === 'number' && cost >= 0);
  });
});

test('AI client: estimateCost con usage vacío es 0', () => {
  assert.equal(aiClient.estimateCost(null), 0);
  assert.equal(aiClient.estimateCost({}), 0);
});

test('AI usage: incremento y lectura diaria', async () => {
  const originalGetDoc = aiUsage.store.getDoc;
  const originalSetDoc = aiUsage.store.setDoc;
  let calls = {};
  aiUsage.store.getDoc = async (c, id) => calls[id] || null;
  aiUsage.store.setDoc = async (c, id, data) => { calls[id] = data; return data; };

  assert.equal(await aiUsage.usedToday('u1'), 0);
  await aiUsage.incrementUsage('u1', 'tutor', { tokens: 100, estimatedCost: 0.001 });
  await aiUsage.incrementUsage('u1', 'tutor', { tokens: 50 });
  assert.equal(await aiUsage.usedToday('u1'), 2);

  aiUsage.store.getDoc = originalGetDoc;
  aiUsage.store.setDoc = originalSetDoc;
});
