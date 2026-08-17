// services/sessionGuard.ts
// Evita que un dispositivo expulsado (SESSION_EXPIRED) se auto-reloguee y
// "pelee" con el dispositivo que tomó la sesión (ping-pong).
// El flag se limpia cuando el usuario inicia sesión manualmente (intención real).

let kicked = false;

export function isKicked(): boolean {
  return kicked;
}

export function setKicked(value: boolean): void {
  kicked = value;
}

export function clearKicked(): void {
  kicked = false;
}