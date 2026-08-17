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

// Lee un texto en voz alta. Detecta el idioma: español -> voz es-CO (colombiana),
// inglés -> voz en-US. Notifica vía onEnd cuando termina (para conversación continua).
export async function speak(text: string, options?: SpeakOptions) {
  if (!('speechSynthesis' in window)) {
    options?.onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  const es = isSpanish(text);
  const u = new SpeechSynthesisUtterance(text);
  u.lang = es ? 'es-CO' : 'en-US';
  u.rate = options?.rate ?? getSpeechSpeed();

  const voices = await loadVoices();
  const voice = pickVoice(es ? 'es' : 'en', voices);
  if (voice) u.voice = voice;

  u.onend = () => options?.onEnd?.();
  u.onerror = () => options?.onEnd?.();
  synth.speak(u);
}