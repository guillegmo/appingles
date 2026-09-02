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

// Regresión: buildSystemPrompt('stuck', ...) hacía MODES['stuck'] || MODES.Conversation,
// y 'stuck' nunca estuvo en MODES (STUCK_PROMPT vive aparte) — SIEMPRE caía a
// Conversation, así que la instrucción de responder 100% en español nunca se
// aplicaba de verdad. El test anterior solo comprobaba la constante suelta,
// no lo que esta función realmente arma y envía al modelo.
test('Prompts: buildSystemPrompt("stuck", ...) usa STUCK_PROMPT, no Conversation', () => {
  const built = prompts.buildSystemPrompt('stuck', { level: 'beginner' });
  assert.match(built, /ESPAÑOL/);
  assert.ok(built.startsWith(prompts.STUCK_PROMPT.system), 'debe empezar con el system de STUCK_PROMPT');
  assert.ok(!built.startsWith(prompts.MODES.Conversation.system), 'no debe caer en el prompt de Conversation');
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

test('AI usage: incremento atómico y lectura diaria (store real, doc temporal)', async () => {
  const U = 'unit3-usage';
  const { id } = (() => {
    const date = new Date().toISOString().slice(0, 10);
    return { id: `${U}_${date}` };
  })();

  await aiUsage.store.deleteDoc('aiUsage', id);
  try {
    assert.equal(await aiUsage.usedToday(U), 0);
    await aiUsage.incrementUsage(U, 'tutor', { tokens: 100, estimatedCost: 0.001 });
    await aiUsage.incrementUsage(U, 'tutor', { tokens: 50 });
    assert.equal(await aiUsage.usedToday(U), 2);

    const doc = await aiUsage.store.getDoc('aiUsage', id);
    assert.equal(doc.tutor.tokens, 150);
    assert.equal(doc.userId, U);
  } finally {
    await aiUsage.store.deleteDoc('aiUsage', id);
  }
});

test('AI usage: reserve aplica el límite diario de forma atómica', async () => {
  const U = 'unit3-reserve';
  const date = new Date().toISOString().slice(0, 10);
  const id = `${U}_${date}`;
  await aiUsage.store.deleteDoc('aiUsage', id);
  try {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => aiUsage.reserve(U, 'tutor', 3)),
    );
    const ok = results.filter((r) => r.ok).length;
    assert.equal(ok, 3);
    assert.equal(await aiUsage.usedToday(U), 3);

    // Liberar una reserva devuelve el cupo
    await aiUsage.release(U, 'tutor');
    assert.equal(await aiUsage.usedToday(U), 2);
    const again = await aiUsage.reserve(U, 'tutor', 3);
    assert.equal(again.ok, true);
    assert.equal(again.used, 3);
  } finally {
    await aiUsage.store.deleteDoc('aiUsage', id);
  }
});
