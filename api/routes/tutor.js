// routes/tutor.js
// Tutor IA: chat por modos + "I'm Stuck".
// - Acceso: todos los usuarios; Free tiene 3 mensajes IA/día de muestra,
//   Premium IA (suscripción recurrente) tiene 60 mensajes IA/día.
// - Límite diario de mensajes según entitlement (aiMessagesPerDay), aplicado
//   con reserva atómica (transacción): peticiones simultáneas no lo superan.
// - Idempotencia: un requestId del cliente deduplica reintentos (doble clic,
//   retry de red) para que 1 acción del usuario = 1 mensaje consumido.
// - Rate limit anti-spam por usuario (además del límite diario).
// - Memoria contextual: colección 'conversations' por user+mode (ventana corta).

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const store = require('../lib/store');
const entitlement = require('../services/entitlement');
const aiUsage = require('../services/aiUsage');
const aiClient = require('../services/aiClient');
const prompts = require('../services/prompts');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const CONTEXT_WINDOW = 12; // últimos N mensajes enviados al modelo
const MODE_PARAM = 'tutor';
const MAX_MESSAGE_LENGTH = 2000; // ~350 palabras: varias frases sí, abuso no

// Anti-spam/automatización: 20 mensajes/minuto es muy por encima del uso
// normal (escribir + leer) y muy por debajo de bots. El tope real sigue
// siendo el límite diario. Clave por userId (req.user ya está cargado).
const tutorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.TUTOR_RATE_PER_MIN) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'rate_limited', message: 'Demasiados mensajes seguidos. Espera unos segundos.' },
});

// Idempotencia: colección 'aiRequests' doc `${userId}_${requestId}`.
// Estados: processing -> done | (eliminado si la IA falló, permite reintentar).
const REQUEST_TTL_MS = 10 * 60 * 1000;

function requestIdOf(body) {
  const raw = body?.requestId;
  if (typeof raw !== 'string') return null;
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(raw)) return null;
  return raw;
}

// Check-and-create atómico del registro de idempotencia.
// Devuelve { fresh: true } o { duplicate: true, response } o { inFlight: true }.
async function beginIdempotentRequest(userId, requestId) {
  const id = `${userId}_${requestId}`;
  const now = Date.now();
  return store.runTransaction(async (tx) => {
    const doc = await tx.get('aiRequests', id);
    if (doc) {
      const age = now - new Date(doc.createdAt || 0).getTime();
      if (doc.response && age < REQUEST_TTL_MS) {
        return { duplicate: true, response: doc.response };
      }
      if (!doc.response && age < REQUEST_TTL_MS) {
        return { inFlight: true };
      }
      // Expirado: se recicla el registro para esta petición.
    }
    tx.set('aiRequests', id, { userId, status: 'processing', createdAt: new Date(now).toISOString() });
    return { fresh: true };
  });
}

async function completeIdempotentRequest(userId, requestId, response) {
  await store.setDoc(`aiRequests`, `${userId}_${requestId}`, {
    userId,
    requestId,
    status: 'done',
    createdAt: new Date().toISOString(),
    response,
  });
}

async function failIdempotentRequest(userId, requestId) {
  // Elimina el registro para que un reintento legítimo con la misma clave funcione.
  await store.deleteDoc('aiRequests', `${userId}_${requestId}`).catch(() => {});
}

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
  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (!trimmed) {
    return res.status(400).json({ error: 'message es requerido' });
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: 'message_too_long',
      message: `El mensaje es demasiado largo (máximo ${MAX_MESSAGE_LENGTH} caracteres). Divídelo en dos.`,
    });
  }

  // Idempotencia: si el cliente envía requestId, deduplica reintentos ANTES de
  // reservar cupo (un reintento no debe consumir otro mensaje).
  const requestId = requestIdOf(req.body);
  if (requestId) {
    const begin = await beginIdempotentRequest(req.user.id, requestId);
    if (begin.duplicate) {
      return res.json({ ...begin.response, duplicate: true });
    }
    if (begin.inFlight) {
      return res.status(409).json({ error: 'request_in_flight', message: 'Ese mensaje ya se está procesando.' });
    }
  }

  const ent = entitlementsOf(req);

  try {
    // Reserva atómica del mensaje ANTES de cualquier otra lectura: si el límite
    // diario ya se alcanzó, respondemos 429 con UNA sola lectura (check+incremento
    // dentro de la transacción), sin leer historial ni perfil. Peticiones
    // simultáneas no pueden exceder aiMessagesPerDay.
    const reservation = await aiUsage.reserve(req.user.id, MODE_PARAM, ent.aiMessagesPerDay);
    if (!reservation.ok) {
      if (requestId) await failIdempotentRequest(req.user.id, requestId);
      return res.status(429).json({ error: 'ai_limit_reached', message: 'Alcanzaste tu límite diario de mensajes IA.', used: reservation.used, limit: ent.aiMessagesPerDay });
    }

    // Historial y contexto en paralelo (1 round trip).
    const [history, context] = await Promise.all([
      getConversation(req.user.id, modeId),
      userContext(req.user.id),
    ]);
    const modelMessages = buildModelMessages(modeId, history, trimmed, context);

    // Si la IA falla, se revierte la reserva Y el registro de idempotencia para
    // no penalizar al usuario ni bloquear su reintento.
    let result;
    try {
      result = await aiClient.chat(modelMessages);
    } catch (err) {
      await Promise.all([
        aiUsage.release(req.user.id, MODE_PARAM).catch(() => {}),
        requestId ? failIdempotentRequest(req.user.id, requestId) : Promise.resolve(),
      ]);
      throw err;
    }

    const now = new Date().toISOString();
    const nextHistory = [
      ...history,
      { role: 'user', content: trimmed, at: now },
      { role: 'assistant', content: result.content, at: now },
    ];

    // Tokens/coste reales (incremento atómico sin lectura) + guardado del
    // historial, en paralelo (independientes entre sí).
    const usageMeta = {
      tokens: result.usage?.total_tokens || 0,
      inputTokens: result.usage?.prompt_tokens || 0,
      outputTokens: result.usage?.completion_tokens || 0,
      estimatedCost: aiClient.estimateCost(result.usage),
    };
    await Promise.all([
      aiUsage.addTokens(req.user.id, MODE_PARAM, usageMeta),
      saveConversation(req.user.id, modeId, nextHistory),
    ]);

    const payload = {
      reply: result.content,
      mode: modeId,
      used: reservation.used,
      limit: ent.aiMessagesPerDay,
      mock: result.mock,
    };

    // Cachea la respuesta bajo la clave de idempotencia (reintentos reciben
    // exactamente la misma respuesta sin consumir otro mensaje).
    if (requestId) await completeIdempotentRequest(req.user.id, requestId, payload);

    res.json(payload);
  } catch (err) {
    if (requestId) await failIdempotentRequest(req.user.id, requestId);
    throw err;
  }
}

// POST /tutor/message — body: { mode, message, requestId? }
router.post('/message', tutorLimiter, async (req, res) => {
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

// POST /tutor/stuck — body: { message, requestId? }
router.post('/stuck', tutorLimiter, async (req, res) => {
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
