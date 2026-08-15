import { useSyncExternalStore } from 'react';

export const SPEED_OPTIONS = [
  { label: '1x', value: 1 },
  { label: '0.75x', value: 0.75 },
  { label: '0.5x', value: 0.5 },
];

const KEY = 'appingles_speech_speed';
const DEFAULT = 0.75;

const listeners = new Set<() => void>();

function read(): number {
  const v = Number(localStorage.getItem(KEY));
  return SPEED_OPTIONS.some((o) => o.value === v) ? v : DEFAULT;
}

export function getSpeechSpeed(): number {
  return read();
}

export function setSpeechSpeed(value: number): void {
  localStorage.setItem(KEY, String(value));
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSpeechSpeed(): number {
  return useSyncExternalStore(subscribe, read);
}
