// routes/content.js
// Acceso al curriculum post-21 (lecciones por skill/situación).
// Fusiona el curriculum curado (content/) con lecciones generadas por IA y publicadas.

const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const content = require('../lib/content');
const entitlement = require('../services/entitlement');
const contentGenerator = require('../services/contentGenerator');
const aiUsage = require('../services/aiUsage');
const aiClient = require('../services/aiClient');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Lecciones IA publicadas (colección contentDrafts, status published).
// Query filtrada en el store: no se leen los borradores ni documentos de
// otras colecciones (antes: listDocs completo + filtro en Node).
async function publishedAiLessons() {
  return store.queryDocs('contentDrafts', { filters: [{ field: 'status', op: '==', value: 'published' }] });
}

function summarize(l) {
  return { id: l.id, title: l.title, skill: l.skill, situation: l.situation, topic: l.topic, estimatedTime: l.estimatedTime, difficulty: l.difficulty, goal: l.goal };
}

// GET /content/post21 -> índice de lecciones (filtro opcional por skill/situation)
router.get('/post21', async (req, res) => {
  const progress = (await store.getDoc('progress', req.user.id)) || {};
  if (!progress.completedDays?.includes(21)) {
    return res.status(403).json({ error: 'post21_required', message: 'Completa el reto de 21 días para desbloquear el contenido continuo.' });
  }

  const curriculum = content.getPost21('curriculum');
  const aiLessons = await publishedAiLessons();
  const allLessons = [...curriculum.lessons, ...aiLessons];

  const { skill, situation } = req.query;
  let lessons = allLessons;
  if (skill) lessons = lessons.filter((l) => l.skill === skill);
  if (situation) lessons = lessons.filter((l) => l.situation === situation);

  res.json({
    skills: curriculum.skills,
    situations: curriculum.situations,
    lessons: lessons.map(summarize),
  });
});

// GET /content/post21/:id -> detalle de una lección (curada o IA publicada)
router.get('/post21/:id', async (req, res) => {
  const progress = (await store.getDoc('progress', req.user.id)) || {};
  if (!progress.completedDays?.includes(21)) {
    return res.status(403).json({ error: 'post21_required', message: 'Completa el reto de 21 días para desbloquear el contenido continuo.' });
  }

  const curriculum = content.getPost21('curriculum');
  let lesson = curriculum.lessons.find((l) => l.id === req.params.id);
  if (!lesson) {
    const ai = await store.getDoc('contentDrafts', req.params.id);
    if (ai?.status === 'published') lesson = ai;
  }
  if (!lesson) return res.status(404).json({ error: 'not_found', message: 'Lección no encontrada.' });

  res.json(lesson);
});

// POST /content/post21/generate -> lección IA on-demand (Premium IA)
// body: { skill, situation, topic }
// Genera y publica directamente una lección personalizada para el usuario.
router.post('/post21/generate', async (req, res) => {
  const ent = entitlement.buildEntitlements(req.subscription);
  if (!ent.canGenerateLessons) {
    return res.status(403).json({ error: 'premium_required', message: 'Las lecciones IA on-demand son parte de Premium IA.' });
  }
  const { skill, situation, topic } = req.body || {};
  if (!topic || !String(topic).trim()) {
    return res.status(400).json({ error: 'topic es requerido' });
  }

  try {
    const { id, lesson } = await contentGenerator.generateLesson({
      skill: skill || 'conversation',
      situation: situation || 'social',
      topic: String(topic).trim().slice(0, 60),
    });
    const pub = await contentGenerator.publishLesson(id);
    if (!pub.ok) return res.status(500).json({ error: 'publish_failed' });

    await aiUsage.incrementUsage(req.user.id, 'content', {
      tokens: lesson.usage?.total_tokens || 0,
      estimatedCost: aiClient.estimateCost(lesson.usage),
    });

    res.json({ id, lesson: pub.lesson });
  } catch (err) {
    console.error('Content generation error:', err.message);
    res.status(502).json({ error: 'ai_unavailable', message: 'No se pudo generar la lección. Intenta de nuevo.' });
  }
});

module.exports = router;
