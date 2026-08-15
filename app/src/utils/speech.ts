import { getSpeechSpeed } from './speechSettings';

export function speak(text: string, rate?: number) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate ?? getSpeechSpeed();
  window.speechSynthesis.speak(u);
}
