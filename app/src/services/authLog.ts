// services/authLog.ts
// Observabilidad SEGURA del flujo de autenticación/sesión.
// Solo emite marcadores de progreso (tags) y datos no sensibles (duraciones,
// booleans, endpoints). NUNCA registra contraseñas, tokens de Firebase, claves
// de API, cookies ni información personal identificable.
//
// Deshabilitado en producción salvo que se active explícitamente con
// VITE_AUTH_DEBUG=1 (para diagnósticos puntuales sin tocar el código).

const ENABLED = import.meta.env.DEV || import.meta.env.VITE_AUTH_DEBUG === '1';

export function authLog(tag: string, detail?: Record<string, unknown>): void {
  if (!ENABLED) return;
  // eslint-disable-next-line no-console
  console.info(`[auth] ${tag}`, detail ? JSON.stringify(detail) : '');
}
