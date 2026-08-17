// routes/tutor.js
// Tutor IA: chat por modos + "I'm Stuck".
// - Acceso: todos los usuarios; Free tiene 3 mensajes IA/día de muestra,
//   Premium IA (suscripción recurrente) tiene el límite completo.
// - Límite diario de mensajes según entitlement (aiMessagesPerDay).
// - Memoria contextual: colección 'conversations' por user+mode.

const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const entitlement = require('../services/entitlement');
const aiUsage = require('../services/aiUsage');
const aiClient = require('../services/aiClient');
const prompts = require('../services/prompts');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const CONTEXT_WINDOW = 12; // últimos N mensajes enviados al modelo
const MODE_PARAM = 'tutor';

function entitlementsOf(req) {
  return entitlement.buildEntitlements(req.subscription);
}

// El acceso al tutor está abierto (Free tiene 3 mensajes de muestra al día);
// el tope real lo impone aiMessagesPerDay en handleMessage.
function canAccessTutor(req) {
  return entitlementsOf(req).aiMessagesPerDay > 0;
}

// Contexto del usuario para el system prompt (nivel + debilidades).
async function userContext(userId) {
  const profileDoc = await store.getDoc('profiles', userId);
  const profile = profileDoc?.profile || null;
  return {
    level: profile?.level || 'beginner',
    weaknesses: profile?.needsImprovement || [],
    goal: profile?.recommendedPractice || 'practicar inglés a diario',
  };
}

async function getConversation(userId, mode) {
  const id = `${userId}_${mode}`;
  const doc = await store.getDoc('conversations', id);
  return doc?.messages || [];
}

async function saveConversation(userId, mode, messages) {
  const id = `${userId}_${mode}`;
  await store.setDoc('conversations', id, {
    userId,
    mode,
    updatedAt: new Date().toISOString(),
    messages: messages.slice(-200), // cap de historial almacenado
  });
}

// Construye los messages del modelo: system + historial (último contexto) + nuevo user.
function buildModelMessages(modeId, history, userMessage, context) {
  const system = modeId === 'stuck'
    ? prompts.buildSystemPrompt('stuck', context)
    : prompts.buildSystemPrompt(modeId, context);
  const systemMsg = { role: 'system', content: system };
  const tail = history.slice(-CONTEXT_WINDOW).map(({ role, content }) => ({ role, content }));
  const userMsg = { role: 'user', content: userMessage };
  return [systemMsg, ...tail, userMsg];
}

async function handleMessage(req, res, modeId) {
  if (!canAccessTutor(req)) {
    return res.status(403).json({ error: 'ai_disabled', message: 'El Tutor IA no está disponible.' });
  }

  const { message } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message es requerido' });
  }

  const ent = entitlementsOf(req);
  const used = await aiUsage.usedToday(req.user.id, MODE_PARAM);
  if (used >= ent.aiMessagesPerDay) {
    return res.status(429).json({ error: 'ai_limit_reached', message: 'Alcanzaste tu límite diario de mensajes IA.', used, limit: ent.aiMessagesPerDay });
  }

  const history = await getConversation(req.user.id, modeId);
  const context = await userContext(req.user.id);
  const modelMessages = buildModelMessages(modeId, history, message.trim(), context);

  // Reserva el mensaje ANTES de llamar a la IA (el check anterior queda pegado al
  // incremento, sin la carrera de check-then-act con la llamada lenta de red).
  // Si la IA falla, se revierte la reserva para no penalizar al usuario.
  await aiUsage.addUsage(req.user.id, MODE_PARAM, { count: 1 });
  let result;
  try {
    result = await aiClient.chat(modelMessages);
  } catch (err) {
    await aiUsage.addUsage(req.user.id, MODE_PARAM, { count: -1 }).catch(() => {});
    throw err;
  }

  await aiUsage.addUsage(req.user.id, MODE_PARAM, {
    tokens: result.usage?.total_tokens || 0,
    estimatedCost: aiClient.estimateCost(result.usage),
  });

  const now = new Date().toISOString();
  const nextHistory = [
    ...history,
    { role: 'user', content: message.trim(), at: now },
    { role: 'assistant', content: result.content, at: now },
  ];
  await saveConversation(req.user.id, modeId, nextHistory);

  res.json({
    reply: result.content,
    mode: modeId,
    used: used + 1,
    limit: ent.aiMessagesPerDay,
    mock: result.mock,
  });
}

// POST /tutor/message — body: { mode, message }
router.post('/message', async (req, res) => {
  const { mode } = req.body || {};
  const resolved = mode === 'stuck' ? null : prompts.resolveMode(mode);
  if (!resolved) {
    return res.status(400).json({ error: 'Modo inválido' });
  }
  try {
    await handleMessage(req, res, resolved.id);
  } catch (err) {
    console.error('Tutor error:', err.message);
    res.status(502).json({ error: 'ai_unavailable', message: 'El tutor no respondió. Intenta de nuevo.' });
  }
});

// POST /tutor/stuck — body: { message }
router.post('/stuck', async (req, res) => {
  try {
    await handleMessage(req, res, 'stuck');
  } catch (err) {
    console.error('Tutor stuck error:', err.message);
    res.status(502).json({ error: 'ai_unavailable', message: 'El tutor no respondió. Intenta de nuevo.' });
  }
});

// GET /tutor/history?mode=roleplay — historial reciente del modo (incluye stuck)
router.get('/history', async (req, res) => {
  if (!canAccessTutor(req)) return res.status(403).json({ error: 'ai_disabled', message: 'El Tutor IA no está disponible.' });
  const raw = req.query.mode || 'conversation';
  const resolved = raw === 'stuck' ? { id: 'stuck' } : prompts.resolveMode(raw) || prompts.MODES.Conversation;
  const history = await getConversation(req.user.id, resolved.id);
  res.json({ mode: resolved.id, messages: history });
});

// GET /tutor/usage — mensajes usados hoy / límite
router.get('/usage', async (req, res) => {
  const ent = entitlementsOf(req);
  const used = await aiUsage.usedToday(req.user.id, MODE_PARAM);
  res.json({ used, limit: ent.aiMessagesPerDay, premium: ent.plan === 'premium' });
});

// GET /tutor/modes — catálogo de modos
router.get('/modes', (req, res) => {
  const modes = Object.values(prompts.MODES).map((m) => ({ id: m.id, label: m.label, description: m.description }));
  res.json({ modes, stuck: { id: 'stuck', label: "I'm Stuck", description: prompts.STUCK_PROMPT.description } });
});

module.exports = router;
