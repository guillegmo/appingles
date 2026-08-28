import { test, expect } from '@playwright/test';
import { newOnboardedUser, SPEECH_MOCK_SCRIPT } from '../helpers/testUser';
import { apiAuthed, tokenFromPage, sessionFromPage } from '../helpers/apiClient';
import { solveExercise, type DayExercise } from '../helpers/solveExercise';

test.describe('Flujo Día 1', () => {
  test('completa el día 1 completo (aprender → escuchar → pronunciar → practicar → hablar → reto → completado)', async ({ page, request }) => {
    await page.addInitScript(SPEECH_MOCK_SCRIPT);
    await newOnboardedUser(page, 'day1');

    // Contenido real del Día 1 (fuente de verdad para el solver).
    const token = await tokenFromPage(page);
    const session = await sessionFromPage(page);
    const api = apiAuthed(request, '', token, session);
    const { res, body } = await api.get('/challenge/day/1');
    expect(res.status()).toBe(200);
    const day = body as { title: string; exercises: DayExercise[] };
    const exercises = day.exercises;
    expect(exercises.length).toBeGreaterThan(0);

    // Empezar Día 1 desde el dashboard
    await page.getByRole('button', { name: /Comenzar Día 1|Continuar Día 1/ }).first().click();
    await expect(page).toHaveURL(/\/day\/1/);
    await expect(page.getByRole('heading', { name: day.title })).toBeVisible();
    await expect(page.getByText('Estación 1 de 21')).toBeVisible();

    // Paso 1 — Aprender
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 — Escuchar
    await expect(page.getByRole('heading', { name: '👂 Escuchar' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 3 — Pronunciar
    await expect(page.getByRole('heading', { name: '🗣 Pronunciar' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 4 — Practicar: resuelve los N ejercicios reales de hoy.
    await expect(page.getByRole('heading', { name: '✏️ Practicar' })).toBeVisible();
    for (let i = 0; i < exercises.length; i++) {
      await solveExercise(page, exercises[i], i + 1, exercises.length);
    }

    // Paso 5 — Hablar (con mock de voz)
    await expect(page.getByRole('heading', { name: '🎤 Hablar' })).toBeVisible();
    for (let i = 1; i <= 3; i++) {
      await page.getByRole('button', { name: 'Pulsar para hablar' }).click();
      await expect(page.getByText('¡Muy bien!')).toHaveCount(i, { timeout: 10_000 });
    }
    const completarHabla = page.getByRole('button', { name: 'Completar práctica de habla' });
    await expect(completarHabla).toBeEnabled();
    await completarHabla.click();

    // Paso 6 — Reto de la vida real
    await expect(page.getByRole('heading', { name: '⚡ Reto de la vida real' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 7 — Completado
    await expect(page.getByRole('heading', { name: '¡Día 1 completado!' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar al siguiente día' }).click();

    // Regresa al dashboard con el día guardado (XP/persistencia verificadas por API).
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByText('1/21 días')).toBeVisible({ timeout: 30_000 });

    const { res: progRes, body: progBody } = await api.get('/challenge/progress');
    expect(progRes.status()).toBe(200);
    expect(progBody.daysCompleted).toBe(1);
    expect(progBody.completedDays).toContain(1);
    expect(progBody.totalXp).toBeGreaterThan(0);
  });
});