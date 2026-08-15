// services/contentGenerator.js
// Generación de contenido IA con flujo draft -> published.
// - generateLesson: crea una lección (draft) vía aiClient (Groq).
// - publishLesson: valida y marca como published en la colección 'contentDrafts'.

const store = require('../lib/store');
const aiClient = require('./aiClient');

// Prompt de sistema para generar lecciones consistentes con el curriculum.
const GENERATOR_SYSTEM = `Eres un curriculum designer de inglés (nivel beginner/elementary).
Genera UNA lección de 15 min para un estudiante que habla español, siguiendo EXACTAMENTE este JSON
(sin markdown, sin comentarios, válido):

{
  "id": "gen-<slug-unico>",
  "title": "Título corto",
  "level": "beginner | elementary",
  "skill": "speaking | listening | vocabulary | grammar | conversation",
  "situation": "travel | work | social | shopping | restaurant | phone | interviews",
  "topic": "Tema corto",
  "estimatedTime": 15,
  "difficulty": 1,
  "premium": true,
  "contentType": "lesson",
  "goal": "Objetivo en 1 frase.",
  "vocabulary": [ { "en": "word", "es": "traducción" } ],
  "phrases": [ { "en": "phrase in English", "es": "traducción" } ],
  "speak": "Instrucción de speaking.",
  "challenge": "Reto final.",
  "generated_by": "ai",
  "status": "draft"
}

REGLAS:
- 4 ítems de vocabulary y 4 de phrases.
- Frases en inglés natural, nivel beginner/elementary.
- El topic lo define el usuario; NO inventes otro.
- Respuesta SOLO JSON.`;

// Limpia la respuesta del modelo: quita fences de markdown y el texto alrededor del JSON.
function parseJsonResponse(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('Respuesta IA sin JSON válido');
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error('JSON inválido en respuesta IA');
  }
}

// Genera una lección en draft. Devuelve la lección guardada en 'contentDrafts'.
async function generateLesson({ skill = 'conversation', situation = 'social', topic = 'Small talk' }) {
  const prompt = `Genera una lección con:\n- skill: ${skill}\n- situation: ${situation}\n- topic: ${topic}`;
  const messages = [
    { role: 'system', content: GENERATOR_SYSTEM },
    { role: 'user', content: prompt },
  ];

  const result = await aiClient.chat(messages, { temperature: 0.7, maxTokens: 800 });
  const lesson = parseJsonResponse(result.content);

  // Sanidad mínima
  if (!lesson.title || !lesson.vocabulary || !Array.isArray(lesson.vocabulary) || !lesson.phrases) {
    throw new Error('Lección generada incompleta');
  }

  lesson.status = 'draft';
  lesson.generatedBy = 'ai';
  lesson.createdAt = new Date().toISOString();
  lesson.usage = result.usage || null;
  lesson.mock = result.mock === true;

  const id = lesson.id || `gen-${Date.now()}`;
  await store.setDoc('contentDrafts', id, { ...lesson, id });
  return { id, lesson };
}

// Publica un draft (validando que exista y esté en draft). Colección separada
// para no mezclar contenido curado con generado.
async function publishLesson(id) {
  const draft = await store.getDoc('contentDrafts', id);
  if (!draft) return { ok: false, error: 'draft_not_found' };
  if (draft.status !== 'draft') return { ok: false, error: 'already_published' };

  const published = { ...draft, status: 'published', publishedAt: new Date().toISOString() };
  await store.setDoc('contentDrafts', id, published);
  return { ok: true, lesson: published };
}

async function listDrafts({ status } = {}) {
  const all = await store.listDocs('contentDrafts');
  return status ? all.filter((d) => d.status === status) : all;
}

module.exports = { generateLesson, publishLesson, listDrafts, parseJsonResponse };
