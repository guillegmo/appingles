const SPANISH_WORDS = new Set([
  'yo', 'mi', 'me', 'nos', 'tu', 'te', 'el', 'ella', 'ellos', 'ellas', 'usted', 'ustedes',
  'es', 'son', 'estoy', 'estas', 'estás', 'estamos', 'estan', 'están', 'ser', 'estar', 'tengo',
  'quiero', 'quieres', 'puedo', 'puedes', 'necesito', 'gustaria', 'gustaría', 'mejor', 'bien',
  'mal', 'hola', 'adios', 'adiós', 'gracias', 'por', 'favor', 'perdon', 'perdón', 'disculpa',
  'como', 'cómo', 'que', 'qué', 'cuando', 'cuándo', 'donde', 'dónde', 'porque', 'porqué', 'porque',
  'pero', 'y', 'o', 'tambien', 'también', 'no', 'si', 'sí', 'muy', 'mucho', 'poco', 'nada',
  'todo', 'todos', 'dia', 'día', 'hoy', 'ayer', 'manana', 'mañana', 'noche', 'tarde', 'semana',
  'año', 'anio', 'perro', 'gato', 'casa', 'trabajo', 'escuela', 'amigo', 'familia', 'comida',
  'agua', 'cafe', 'café', 'leche', 'pan', 'manzana', 'quiero', 'puedo', 'quieres', 'puedes',
  'aprender', 'hablar', 'estudiar', 'practicar', 'entender', 'escuchar', 'leer', 'escribir',
  'se', 'sé', 'sabes', 'sabe', 'hace', 'haces', 'hacemos', 'tienes', 'tenemos', 'tenes',
  'estoy', 'estas', 'feliz', 'triste', 'cansado', 'contento', 'enojado', 'aburrido', 'ocupado',
  'frio', 'frío', 'calor', 'frio', 'mejor', 'peor', 'grande', 'pequeno', 'pequeño', 'bonito',
  'nuevo', 'viejo', 'facil', 'fácil', 'dificil', 'difícil', 'rapido', 'rápido', 'lento',
]);

// Detecta si un texto transcrito es probablemente español.
// Web Speech con lang=en-US a veces devuelve texto en español si el usuario habla español.
export function isSpanish(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  // Caracteres inequívocamente españoles (no existen en inglés nativo).
  if (/[áéíóúñü¿¡]/.test(lower)) return true;
  const words = lower.replace(/[.,!?¡¿'’"“”]/g, '').split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const hits = words.filter((w) => SPANISH_WORDS.has(w)).length;
  // Si la mayoría de las palabras son españolas o hay al menos 2 marcadores fuertes.
  return hits >= 2 || (words.length <= 2 && hits === words.length);
}
