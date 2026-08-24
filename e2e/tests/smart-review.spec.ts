import { test, expect } from '@playwright/test';
import { newOnboardedUser } from '../helpers/testUser';
import { apiAuthed, tokenFromPage, sessionFromPage } from '../helpers/apiClient';

test.describe('Smart Review (repaso inteligente)', () => {
  test('SR-001 un fallo crea tarjetas de repaso y el modo due las lista', async ({ page, request }) => {
    await newOnboardedUser(page, 'sr1');
    const token = await tokenFromPage(page);
    const session = await sessionFromPage(page);
    const api = apiAuthed(request, '', token, session);

    // Fallar un ejercicio del día 1 → ensureCards crea tarjetas por palabra
    const attempt = await api.post('/exercises/attempt', {
      day: 1,
      exerciseId: 'ex-1',
      type: 'mcq',
      answer: 'incorrecta',
      correct: false,
    });
    expect(attempt.res.status()).toBe(200);

    const { res, body } = await api.get('/review/due');
    expect(res.status()).toBe(200);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0]).toHaveProperty('word');
    expect(body.items[0]).toHaveProperty('es');

    // El contexto debe ir acorde a la palabra (regresión: antes siempre
    // mostraba la primera frase del día, ej. "I like coffee.").
    const byWord = Object.fromEntries(body.items.map((c: { word: string; example: string | null }) => [c.word, c.example]));
    const examples = new Set(body.items.map((c: { example: string | null }) => c.example));
    expect(examples.size).toBeGreaterThan(1);
    expect(byWord['I am from...']).toBe('I am from Mexico.');
    expect(byWord['Nice to meet you']).toBe('Nice to meet you.');
  });

  test('SR-002 registrar quality 5 tres veces marca dominante sin 500 (regresión BUG-002)', async ({ page, request }) => {
    await newOnboardedUser(page, 'sr2');
    const token = await tokenFromPage(page);
    const session = await sessionFromPage(page);
    const api = apiAuthed(request, '', token, session);

    await api.post('/exercises/attempt', { day: 1, exerciseId: 'ex-1', type: 'mcq', answer: 'x', correct: false });
    const due = await api.get('/review/due');
    const cardId = due.body.items[0].id;

    for (let i = 0; i < 3; i++) {
      const { res, body } = await api.post(`/review/${cardId}/result`, { quality: 5 });
      // Antes de BUG-002 el 3er quality-5 lanzaba ReferenceError (500)
      expect(res.status()).toBe(200);
      expect(body.ok).toBe(true);
      if (i === 2) expect(body.card.dominant).toBe(true);
    }
  });

  test('SR-003 la página de repaso carga el modo por defecto', async ({ page }) => {
    await newOnboardedUser(page, 'sr3');
    await page.goto('/review');
    await expect(page.getByText('Repaso inteligente')).toBeVisible({ timeout: 30_000 });
    // Sin tarjetas: mensaje vacío amigable
    await expect(page.getByText(/No tienes tarjetas por repasar hoy/)).toBeVisible();
  });

  test('SR-004 API valida quality fuera de rango (400)', async ({ page, request }) => {
    await newOnboardedUser(page, 'sr4');
    const token = await tokenFromPage(page);
    const session = await sessionFromPage(page);
    const api = apiAuthed(request, '', token, session);

    await api.post('/exercises/attempt', { day: 1, exerciseId: 'ex-1', type: 'mcq', answer: 'x', correct: false });
    const due = await api.get('/review/due');
    const cardId = due.body.items[0].id;

    const { res } = await api.post(`/review/${cardId}/result`, { quality: 99 });
    expect(res.status()).toBe(400);
  });

  test('SR-005 al calificar se muestra solo el contexto y se puede escuchar y continuar', async ({ page, request }) => {
    await newOnboardedUser(page, 'sr5');
    const token = await tokenFromPage(page);
    const session = await sessionFromPage(page);
    const api = apiAuthed(request, '', token, session);
    await api.post('/exercises/attempt', { day: 1, exerciseId: 'ex-1', type: 'mcq', answer: 'x', correct: false });

    await page.goto('/review');
    await expect(page.getByText(/¿Qué significa\?/)).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Escuchar y revelar significado' }).click();

    // La traducción directa de la palabra ya no se muestra; solo el contexto.
    expect(await page.locator('p.text-lg.text-gray-600').count()).toBe(0);
    await expect(page.getByText('En contexto')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Escuchar la frase de contexto' })).toBeVisible();

    // Calificar con un botón inferior → se muestra SOLO el contexto + escuchar + Continuar.
    await page.getByRole('button', { name: /Aceptable/ }).click();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Escuchar la frase de contexto' })).toBeVisible();
    expect(await page.locator('p.text-5xl').count()).toBe(0);

    // Continuar avanza a la siguiente tarjeta.
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByText(/¿Qué significa\?/)).toBeVisible();
  });
});