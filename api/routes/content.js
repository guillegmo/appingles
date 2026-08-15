// routes/content.js
// Acceso al curriculum post-21 (lecciones por skill/situación).
// Fusiona el curriculum curado (content/) con lecciones generadas por IA y publicadas.

const express = require('express');
const router = express.Router();
const store = require('../lib/store');
const content = require('../lib/content');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Lecciones IA publicadas (colección contentDrafts, status published).
async function publishedAiLessons() {
  const all = await store.listDocs('contentDrafts');
  return all.filter((d) => d.status === 'published');
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

module.exports = router;
