import { APIRequestContext, expect } from '@playwright/test';

export const API_URL = 'http://localhost:3001/api';

// Petición autenticada contra el backend (dev: X-Dev-User / prod: Bearer token).
// El backend además exige X-Session-Id (sesión única por dispositivo): si no
// coincide con la sesión activa del usuario responde SESSION_EXPIRED (401).
export function apiAuthed(request: APIRequestContext, userId: string, token?: string | null, sessionId?: string | null) {
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : { 'X-Dev-User': userId };
  if (sessionId) headers['X-Session-Id'] = sessionId;
  return {
    get: async (path: string, opts: { params?: Record<string, string | number> } = {}) => {
      const res = await request.get(`${API_URL}${path}`, { headers, params: opts.params });
      return { res, body: await res.json().catch(() => null) };
    },
    post: async (path: string, body: unknown) => {
      const res = await request.post(`${API_URL}${path}`, { headers, data: body });
      return { res, body: await res.json().catch(() => null) };
    },
  };
}

// Extrae el token de Firebase (sesión única por pestaña) del sessionStorage.
export function tokenFromPage(page: { evaluate: (fn: string) => Promise<string | null> }): Promise<string | null> {
  return page.evaluate('sessionStorage.getItem("appingles_token")');
}

// Extrae el sessionId de la pestaña (sesión única) del sessionStorage.
export function sessionFromPage(page: { evaluate: (fn: string) => Promise<string | null> }): Promise<string | null> {
  return page.evaluate('sessionStorage.getItem("appingles_session")');
}

export async function expectOk(res: { res: { status(): number }, body: unknown }) {
  expect(res.res.status()).toBeLessThan(400);
}