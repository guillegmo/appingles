import { test, expect } from '@playwright/test';

const API = 'http://localhost:3001';

test.describe('API (observabilidad y seguridad)', () => {
  test('API-001 el health check responde 200 (montado en la raíz /)', async ({ request }) => {
    const res = await request.get(`${API}/`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('OK');
    expect(body.service).toBe('appingles-api');
  });

  test('API-002 endpoints protegidos rechazan peticiones sin token (401)', async ({ request }) => {
    for (const path of ['/api/challenge', '/api/challenge/progress', '/api/exercises/attempt', '/api/subscription/status', '/api/tutor/modes', '/api/review/due']) {
      const res = await request.get(`${API}${path}`);
      expect(res.status(), `${path} debía rechazar sin auth`).toBe(401);
    }
  });

  test('API-003 una petición con token inválido es rechazada (401)', async ({ request }) => {
    const res = await request.get(`${API}/api/challenge`, {
      headers: { Authorization: 'Bearer token-falso-no-valido' },
    });
    expect(res.status()).toBe(401);
  });

  test('API-004 una ruta inexistente devuelve 404', async ({ request }) => {
    const res = await request.get(`${API}/api/ruta-que-no-existe`);
    expect(res.status()).toBe(404);
  });

  test('API-005 GET /review/count no existe (hallazgo: HomePage lo consume)', async ({ request }) => {
    // El frontend llama GET /api/review/count (HomePage y PracticePage) pero el
    // backend NO define esa ruta. Sin auth, el middleware de autenticación
    // responde 401 antes de llegar al 404 del router. Hallazgo menor: el front
    // lo silencia con .catch() y la "review" pendiente nunca se muestra.
    const res = await request.get(`${API}/api/review/count`);
    expect(res.status()).not.toBe(200);
  });
});