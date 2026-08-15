// services/recommendation.js
// RecommendationEngine: determina qué debe practicar el usuario hoy.
// Entrada: perfil + nivel + debilidades + historial de práctica.
// Salida: misión diaria (vocab 5' + listening 5' + speaking 5' + topic).

const BLOCKS = [
  { block: 'Vocabulary', minutes: 5, contentType: 'flashcards' },
  { block: 'Listening', minutes: 5, contentType: 'audio' },
  { block: 'Speaking', minutes: 5, contentType: 'speaking' },
];

// Selecciona la lección post-21 según la habilidad más débil, rotando para
// no repetir temas practicados recientemente.
function pickLessonForWeakness(curriculum, weakSkill, practicedTopics = []) {
  const skills = [weakSkill, 'conversation', 'speaking'].filter(Boolean);
  for (const skill of skills) {
    const candidates = curriculum.lessons.filter((l) => l.skill === skill);
    const fresh = candidates.find((l) => !practicedTopics.includes(l.topic));
    if (fresh) return fresh;
    if (candidates.length) return candidates[0];
  }
  return null;
}

// Genera la misión diaria. Sin perfil (pre-assessment) usa speaking por defecto.
function buildDailyPractice({ profile, curriculum, progress = {} }) {
  const weakSkill = profile?.needsImprovement?.[0] ?? 'speaking';
  const daily = progress.dailyPractice || {};
  const practicedTopics = Object.values(daily).map((d) => d.topic).filter(Boolean);

  const lesson = pickLessonForWeakness(curriculum, weakSkill, practicedTopics);
  const topic = lesson?.topic || 'Conversación diaria';

  const mission = {
    id: `practice-${new Date().toISOString().slice(0, 10)}`,
    topic,
    weakSkill,
    goal: lesson?.goal || `Practica ${weakSkill} durante 15 minutos.`,
    blocks: BLOCKS,
    lessonId: lesson?.id || null,
    estimatedTime: 15,
    done: false,
  };
  return { mission, lesson };
}

module.exports = { BLOCKS, pickLessonForWeakness, buildDailyPractice };
