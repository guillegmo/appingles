import { getSpeechSpeed } from './speechSettings';
import { isSpanish } from './language';

export type SpeakOptions = {
  rate?: number;
  onEnd?: () => void;
};

// El género no viene en la API de SpeechSynthesis; se infiere del nombre.
// Cubre las voces comunes de Windows/Chrome, macOS y las remotas de Google.
// Se normalizan los diacríticos para que "Raúl" matchee como "raul".
const strip = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const MALE_NAMES =
  /\b(david|mark|george|pablo|daniel|alex|fred|eric|james|thomas|guy|ryan|miguel|jorge|luis|carlos|andres|gonzalo|raul|mateo|ivan|peter|juan|antonio|jose|francisco|fernando|enrique|richard|tom|samuel|henry|arthur|javier|victor|marcus|pavel|alvaro|emilio|julian|rodrigo|sebastian|william|steven|anthony|joseph|robert|michael|matthew|christopher|andrew|philip|eddie|kyle|oscar|jack)\b|male|mascul/i;
const FEMALE_NAMES =
  /\b(sabina|helena|zira|aria|jenny|samantha|allison|ava|emma|fiona|susan|victoria|laura|carmen|paulina|ana|maria|michelle|sarah|kate|grace|bella|olivia|sophia|dana|eva|lena|lucy|martha|stella|mei|karen|moira|tessa|elvira|julia|adriana|natalia|paula|rosa|sofia|alicia|amanda|patricia|jennifer|linda|elena|emily|hannah|isabella|mia|charlotte|amelia|chloe|zoe|kelly|heather|jane|nancy)\b|female|femen/i;

function voiceGender(voice: SpeechSynthesisVoice): 'male' | 'female' | null {
  const name = strip(voice.name);
  if (MALE_NAMES.test(name)) return 'male';
  if (FEMALE_NAMES.test(name)) return 'female';
  return null;
}

// Prioridad de idioma: español nativo LATINO (Colombia > latinoamérica > México >
// cualquier español); inglés nativo de EE.UU. (en-US) antes que cualquier inglés.
function langRank(voice: SpeechSynthesisVoice, lang: 'es' | 'en'): number {
  const l = voice.lang.toLowerCase().replace('_', '-');
  if (lang === 'es') {
    if (l === 'es-co') return 0;
    if (l.startsWith('es-419')) return 1;
    if (l === 'es-mx') return 2;
    if (l.startsWith('es-')) return 3;
    if (/spanish|español/i.test(voice.name)) return 4;
    return 99;
  }
  if (l === 'en-us') return 0;
  if (l.startsWith('en-')) return 1;
  if (/english/i.test(voice.name)) return 2;
  return 99;
}

function rankByLang(voices: SpeechSynthesisVoice[], lang: 'es' | 'en'): SpeechSynthesisVoice[] {
  return voices
    .filter((v) => langRank(v, lang) < 99)
    .sort((a, b) => langRank(a, lang) - langRank(b, lang));
}

// Elige el PAR español+inglés con el MISMO GÉNERO (masculino primero, por la
// personalidad del tutor) y, dentro del género, del MISMO PROVEEDOR
// (localService) para que el timbre sea parecido. Resultado: la parte en
// español la lee un nativo latino y la parte en inglés un americano nativo,
// como si fueran la misma persona bilingüe.
function pickVoicePair(voices: SpeechSynthesisVoice[]): { esVoice: SpeechSynthesisVoice | null; enVoice: SpeechSynthesisVoice | null } {
  const esList = rankByLang(voices, 'es');
  const enList = rankByLang(voices, 'en');
  for (const gender of ['male', 'female'] as const) {
    const esG = esList.filter((v) => voiceGender(v) === gender);
    const enG = enList.filter((v) => voiceGender(v) === gender);
    if (!esG.length || !enG.length) continue;
    for (const local of [true, false]) {
      const es = esG.find((v) => v.localService === local) ?? esG[0];
      const en = enG.find((v) => v.localService === local) ?? enG[0];
      if (es && en && es.localService === en.localService) {
        return { esVoice: es, enVoice: en };
      }
    }
    return { esVoice: esG[0], enVoice: enG[0] };
  }
  return { esVoice: esList[0] ?? null, enVoice: enList[0] ?? null };
}

// Chrome carga las voces de forma asíncrona; si aún no están, espera a voiceschanged.
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length) return resolve(existing);
    const handler = () => {
      synth.removeEventListener('voiceschanged', handler);
      resolve(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', handler);
    setTimeout(() => {
      synth.removeEventListener('voiceschanged', handler);
      resolve(synth.getVoices());
    }, 1200);
  });
}

// Limpia el texto para que la voz no lea marcas ni emojis. Mantiene comillas y
// paréntesis porque se usan como fronteras para separar idiomas.
function cleanForSpeech(text: string): string {
  return text
    .replace(/[`*_#>|[\]{}]/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    .replace(/\uFE0F|\u200D/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

type Segment = { text: string; lang: 'es' | 'en' };

// Divide el texto en "átomos": comillas dobles (ejemplos en inglés) y
// paréntesis (traducciones al español) como fronteras. Así un ejemplo en inglés
// ("I eat breakfast") se lee con voz americana nativa y su traducción
// (yo desayuno cada día) con voz latina, sin contaminar lo que viene después.
function splitAtoms(text: string): string[] {
  const atoms: string[] = [];
  const re = /(["“”'’][^"“”'’]*["“”'’]|\([^()]*\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) atoms.push(text.slice(last, m.index));
    atoms.push(m[0]);
    last = m.index + m[0].length;
  }
  if (last < text.length) atoms.push(text.slice(last));
  return atoms.length ? atoms : [text];
}

// Agrupa átomos consecutivos del mismo idioma para no fragmentar de más.
function buildSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  for (const atom of splitAtoms(text)) {
    if (!atom.trim()) continue;
    // El tutor usa paréntesis para las traducciones al español ("book (libro)"),
    // así que un átomo entre paréntesis se lee con la voz latina aunque su
    // texto no tenga acentos ("(yo desayuno)").
    const lang = atom.startsWith('(') && atom.endsWith(')') ? 'es' : isSpanish(atom) ? 'es' : 'en';
    const last = segments[segments.length - 1];
    if (last && last.lang === lang) last.text += atom;
    else segments.push({ text: atom, lang });
  }
  return segments;
}

// Divide un bloque largo del mismo idioma en oraciones para que el TTS respire
// de forma natural en vez de leer un muro de texto de corrido.
function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?…])\s+/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function buildUtterance(
  _synth: SpeechSynthesis,
  unit: { text: string; lang: 'es' | 'en' },
  esVoice: SpeechSynthesisVoice | null,
  enVoice: SpeechSynthesisVoice | null,
  rate: number,
): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(unit.text);
  u.lang = unit.lang === 'es' ? 'es-CO' : 'en-US';
  u.voice = unit.lang === 'es' ? esVoice : enVoice;
  u.rate = rate;
  return u;
}

// Lee un texto alternando la voz según el idioma: español -> nativo latino
// (es-CO/es-419), inglés -> nativo americano (en-US), siempre del mismo género
// y proveedor. Las locuciones se encolan SECUENCIALMENTE (una tras otra) para
// garantizar que cada segmento use SU voz — encolarlas todas de golpe hace que
// Chrome a veces repita la primera voz en todo el mensaje.
export async function speak(text: string, options?: SpeakOptions) {
  if (!('speechSynthesis' in window)) {
    options?.onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  const rate = options?.rate ?? getSpeechSpeed();
  const segments = buildSegments(cleanForSpeech(text));
  if (!segments.length) {
    options?.onEnd?.();
    return;
  }

  const voices = await loadVoices();
  const { esVoice, enVoice } = pickVoicePair(voices);

  const units: { text: string; lang: 'es' | 'en' }[] = [];
  for (const seg of segments) {
    for (const sentence of splitSentences(seg.text)) {
      units.push({ text: sentence.replace(/["“”'’]/g, '').replace(/[()]/g, '').trim(), lang: seg.lang });
    }
  }
  if (!units.length) {
    options?.onEnd?.();
    return;
  }

  // Chrome puede descartar la primera locución si se habla inmediatamente
  // después de cancel(); esperamos un instante.
  await new Promise((r) => setTimeout(r, 60));

  if (units.length === 1) {
    const u = buildUtterance(synth, units[0], esVoice, enVoice, rate);
    u.onend = () => options?.onEnd?.();
    u.onerror = () => options?.onEnd?.();
    synth.speak(u);
    return;
  }

  let i = 0;
  const next = () => {
    if (i >= units.length) {
      options?.onEnd?.();
      return;
    }
    const u = buildUtterance(synth, units[i++], esVoice, enVoice, rate);
    u.onend = next;
    u.onerror = () => next();
    synth.speak(u);
  };
  next();
}
