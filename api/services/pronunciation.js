// services/pronunciation.js
// Puntaje de pronunciación (Premium IA).
// Compara la transcripción del usuario (Web Speech en-US) con la frase objetivo.
// Score 0-100: cobertura de palabras del objetivo + similitud de longitud.

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-záéíóúñü']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Similitud Levenshtein normalizada entre dos strings (0..1).
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[m][n];
}

// Compara la transcripción con el objetivo y devuelve un puntaje.
// - matched: palabras del objetivo reconocidas (en orden).
// - coverage: fracción del objetivo presente en la transcripción.
// - lengthSim: castigo por palabras faltantes o extra.
function scorePronunciation({ transcript, target }) {
  const tWords = normalize(target).split(' ').filter(Boolean);
  const sWords = normalize(transcript).split(' ').filter(Boolean);
  if (!tWords.length) return { score: 0, matched: [], totalWords: 0, spokenWords: sWords.length };

  const sSet = new Set(sWords);
  const matched = tWords.filter((w) => sSet.has(w));
  const coverage = matched.length / tWords.length;

  const t = normalize(target);
  const s = normalize(transcript);
  const dist = levenshtein(s, t);
  const lengthSim = Math.max(0, 1 - dist / Math.max(t.length, s.length, 1));

  const score = Math.round((coverage * 0.7 + lengthSim * 0.3) * 100);
  return {
    score: Math.max(0, Math.min(100, score)),
    matched,
    totalWords: tWords.length,
    spokenWords: sWords.length,
  };
}

module.exports = { scorePronunciation, normalize, levenshtein };