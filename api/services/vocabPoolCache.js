// services/vocabPoolCache.js
// Caché en memoria del pool de vocabulario usado por Memory Match, para no
// releer Firestore (reviewCards + vocabulary) en cada partida en modo libre
// (el tablero se pide sin caché de API porque debe ser aleatorio, pero el
// pool de PALABRAS de origen cambia poco). Se invalida al escribir en esas
// colecciones para no servir un pool desactualizado tras fallar un ejercicio
// o añadir una palabra nueva.

const TTL_MS = 60_000;
const cache = new Map();

function get(userId) {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.value;
  return null;
}

function set(userId, value) {
  cache.set(userId, { ts: Date.now(), value });
}

function invalidate(userId) {
  cache.delete(userId);
}

module.exports = { get, set, invalidate };
