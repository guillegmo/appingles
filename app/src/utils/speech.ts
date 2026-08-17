import { getSpeechSpeed } from './speechSettings';
import { isSpanish } from './language';

export type SpeakOptions = {
  rate?: number;
  onEnd?: () => void;
};

// Prefiere voz de español (Colombia), luego latinoamérica, luego cualquier español.
function pickVoice(lang: 'es' | 'en', voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (lang === 'es') {
    return (
      voices.find((v) => v.lang.toLowerCase().replace('_', '-') === 'es-co') ??
      voices.find((v) => v.lang.toLowerCase().startsWith('es-419')) ??
      voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith('es-')) ??
      voices.find((v) => /spanish|español/i.test(v.name)) ??
      null
    );
  }
  return (
    voices.find((v) => v.lang.toLowerCase().replace('_', '-') === 'en-us') ??
    voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith('en-')) ??
    null
  );
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

type Segment = { text: string; lang: 'es' | 'en' };

// Divide el texto en "átomos": trozos entre comillas y trozos sin comillas.
// Así un ejemplo en inglés ("I eat breakfast") dentro de una frase en español
// se lee con voz americana nativa y el resto con voz latina.
function splitAtoms(text: string): string[] {
  const atoms: string[] = [];
  const re = /["“”'’]([^"“”'’]*)["“”'’]/g;
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
    const lang = isSpanish(atom) ? 'es' : 'en';
    const last = segments[segments.length - 1];
    if (last && last.lang === lang) last.text += atom;
    else segments.push({ text: atom, lang });
  }
  return segments;
}

// Lee un texto alternando la voz según el idioma: español -> voz es-CO/es-419
// (latina nativa), inglés -> voz en-US (americano nativo). Cada segmento es un
// utterance encolado; onEnd se dispara cuando termina el último.
export async function speak(text: string, options?: SpeakOptions) {
  if (!('speechSynthesis' in window)) {
    options?.onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  const rate = options?.rate ?? getSpeechSpeed();
  const segments = buildSegments(text);
  if (!segments.length) {
    options?.onEnd?.();
    return;
  }

  const voices = await loadVoices();
  const esVoice = pickVoice('es', voices);
  const enVoice = pickVoice('en', voices);

  const total = segments.length;
  segments.forEach((seg, i) => {
    const u = new SpeechSynthesisUtterance(seg.text);
    u.lang = seg.lang === 'es' ? 'es-CO' : 'en-US';
    if (seg.lang === 'es') {
      if (esVoice) u.voice = esVoice;
    } else if (enVoice) {
      u.voice = enVoice;
    }
    u.rate = rate;
    if (i === 0) u.onerror = () => options?.onEnd?.();
    if (i === total - 1) {
      u.onend = () => options?.onEnd?.();
      u.onerror = () => options?.onEnd?.();
    }
    synth.speak(u);
  });
}