// services/sessionGuard.ts
// Evita que un dispositivo expulsado (SESSION_EXPIRED) se auto-reloguee y
// "pelee" con el dispositivo que tomó la sesión (ping-pong).
// El flag se persiste en localStorage: sobrevive a recargas de página, así el
// dispositivo expulsado no puede reclamar la sesión por accidente.
// Solo se limpia cuando el usuario inicia sesión manualmente (intención real).

const KEY = 'appingles_kicked';

export function isKicked(): boolean {
  return localStorage.getItem(KEY) === '1';
}

export function setKicked(value: boolean): void {
  if (value) localStorage.setItem(KEY, '1');
  else localStorage.removeItem(KEY);
}

export function clearKicked(): void {
  localStorage.removeItem(KEY);
}