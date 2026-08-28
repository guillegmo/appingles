import { test, expect } from '@playwright/test';
import { newOnboardedUser, uniqueEmail, signup, completeOnboarding } from '../helpers/testUser';
import { apiAuthed, tokenFromPage, sessionFromPage } from '../helpers/apiClient';

test.describe('Ejercicios', () => {
  test('EX-001 un fallo en el quiz NO rompe el flujo (regresión BUG-001)', async ({ page, request }) => {
    await newOnboardedUser(page, 'ex1');

    // Contenido real del Día 1: derivamos el total y una opción incorrecta,
    // en lugar de respuestas hardcodeadas que quedan obsoletas al cambiar el día.
    const token = await tokenFromPage(page);
    const session = await sessionFromPage(page);
    const api = apiAuthed(request, '', token, session);
    const { res, body } = await api.get('/challenge/day/1');
    expect(res.status()).toBe(200);
    const exercises = (body.exercises as { type: string; options?: string[]; answer: number }[]) ?? [];
    const ex1 = exercises[0];
    expect(ex1?.options?.length).toBeGreaterThan(0);
    const total = exercises.length;
    const wrongOption = ex1.options!.find((_, i) => i !== ex1.answer)!;

    await page.getByRole('button', { name: 'Comenzar Día 1' }).click();
    await expect(page).toHaveURL(/\/day\/1/);
    await expect(page.getByRole('heading', { name: '🎯 Objetivo de hoy' })).toBeVisible({ timeout: 60_000 });

    // Aprender → Escuchar → Pronunciar → Practicar (esperando cada paso)
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { name: '👂 Escuchar' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { name: '🗣 Pronunciar' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { name: '✏️ Practicar' })).toBeVisible();

    // Responder MAL el primer ejercicio (mcq). Antes de BUG-001 esto devolvía
    // 500 en POST /api/exercises/attempt y rompía la pantalla.
    await page.getByRole('button', { name: wrongOption, exact: true }).click();
    await page.getByRole('button', { name: 'Comprobar respuesta' }).click();

    // No debe aparecer la pantalla de error "Algo salió mal"
    await expect(page.getByText('Algo salió mal')).toHaveCount(0);
    // Y debe avanzar al siguiente ejercicio
    await expect(page.getByText(`2 / ${total}`)).toBeVisible({ timeout: 15_000 });
  });

  test('EX-005 API: intento incorrecto devuelve 200 y registra el fallo (regresión BUG-001)', async ({ page, request }) => {
    await newOnboardedUser(page, 'ex5');
    const token = await tokenFromPage(page);
    const session = await sessionFromPage(page);
    const api = apiAuthed(request, '', token, session);

    const { res, body } = await api.post('/exercises/attempt', {
      day: 1,
      exerciseId: 'ex-1',
      type: 'mcq',
      answer: 'opcion-incorrecta',
      correct: false,
    });
    expect(res.status()).toBe(200);
    expect(body.correct).toBe(false);
    expect(body.xpEarned).toBe(0);
    expect(body.totalXp).toBe(0);
  });

  test('EX-006 API: intento correcto otorga XP y actualiza total', async ({ page, request }) => {
    await newOnboardedUser(page, 'ex6');
    const token = await tokenFromPage(page);
    const session = await sessionFromPage(page);
    const api = apiAuthed(request, '', token, session);

    const before = await api.get('/challenge/progress');
    const xpBefore = before.body.totalXp;

    const { res, body } = await api.post('/exercises/attempt', {
      day: 1,
      exerciseId: 'ex-2',
      type: 'gapfill',
      answer: 'am',
      correct: true,
    });
    expect(res.status()).toBe(200);
    expect(body.correct).toBe(true);
    expect(body.xpEarned).toBeGreaterThan(0);
    expect(body.totalXp).toBe(xpBefore + body.xpEarned);
  });

  test('EX-007 API: valida campos requeridos (400 sin day/exerciseId/correct)', async ({ page, request }) => {
    await newOnboardedUser(page, 'ex7');
    const token = await tokenFromPage(page);
    const session = await sessionFromPage(page);
    const api = apiAuthed(request, '', token, session);

    const { res } = await api.post('/exercises/attempt', { correct: true });
    expect(res.status()).toBe(400);
  });
});