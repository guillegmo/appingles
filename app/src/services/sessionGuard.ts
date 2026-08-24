// services/sessionGuard.ts
// Evita que una pestaña expulsada (SESSION_EXPIRED) se auto-reloguee y "pelee"
// con la que tomó la sesión (ping-pong).
// El flag se persiste en sessionStorage (por pestaña): sobrevive a recargas de
// página sin filtrarse a otras pestañas, así una pestaña expulsada no puede
// reclamar la sesión por accidente ni afectar a la que sigue activa.
// Solo se limpia cuando el usuario inicia sesión manualmente (intención real).

const KEY = 'appingles_kicked';

export function isKicked(): boolean {
  return sessionStorage.getItem(KEY) === '1';
}

export function setKicked(value: boolean): void {
  if (value) sessionStorage.setItem(KEY, '1');
  else sessionStorage.removeItem(KEY);
}

export function clearKicked(): void {
  sessionStorage.removeItem(KEY);
}