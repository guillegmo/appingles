// lib/images.js
// Capa de imágenes pedagógicas: manifiesto estático por concepto
// (content/images/manifest.json), curado a mano con el MCP StockImages en
// tiempo de autoría. La API solo lee este archivo y lo adjunta al contenido
// ya servido — no hay llamadas a proveedores de imágenes en runtime.

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.resolve(__dirname, '..', '..', 'content', 'images', 'manifest.json');
const MIN_VISUAL_POOL = 4; // mínimo de vocabulario con imagen para generar ejercicios visuales

let cache = null;

function loadManifest() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    cache = {};
  }
  return cache;
}

function normalize(word) {
  return String(word || '').trim().toLowerCase().replace(/[.,!?¡¿'’]/g, '');
}

function getImage(concept) {
  return loadManifest()[normalize(concept)] || null;
}

// Adjunta la imagen (si existe en el manifiesto) a cada item de vocabulario.
// No modifica items sin imagen disponible: la app sigue funcionando igual.
function attachImages(vocabulary) {
  if (!Array.isArray(vocabulary)) return vocabulary;
  return vocabulary.map((v) => {
    const image = getImage(v.en);
    return image ? { ...v, image } : v;
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Genera hasta 2 ejercicios visuales (image-choice + listen-image) a partir del
// vocabulario del día que ya tiene imagen identificable. Muchas entradas del
// manifiesto son fotos "de escena" para frases abstractas (quizzable: false):
// sirven para ilustrar la tarjeta de "Aprender" pero no para el quiz "What is
// this?", porque una misma escena podría representar varias frases distintas
// y el ejercicio dejaría de tener una única respuesta correcta.
// Si no hay suficientes palabras identificables (MIN_VISUAL_POOL), no genera
// nada: nunca bloquea ni rompe la práctica.
function buildVisualExercises(vocabulary) {
  const withImage = (vocabulary || []).filter((v) => v.image && v.image.quizzable !== false);
  if (withImage.length < MIN_VISUAL_POOL) return [];

  const pool = shuffle(withImage).slice(0, MIN_VISUAL_POOL);
  const exercises = [];

  const targetA = pool[0];
  exercises.push({
    type: 'image-choice',
    prompt: 'What is this?',
    image: targetA.image,
    options: shuffle(pool.map((v) => v.en)),
    answer: 0, // se recalcula abajo tras el shuffle
  });
  const optsA = exercises[0].options;
  exercises[0].answer = optsA.indexOf(targetA.en);

  if (pool.length >= 2) {
    const targetB = pool[1];
    const shuffledPool = shuffle(pool);
    exercises.push({
      type: 'listen-image',
      prompt: 'Listen and choose the correct image.',
      audio: targetB.en,
      imageOptions: shuffledPool.map((v) => ({ en: v.en, image: v.image })),
      answer: shuffledPool.findIndex((v) => v.en === targetB.en),
    });
  }

  return exercises;
}

module.exports = { getImage, attachImages, buildVisualExercises };
