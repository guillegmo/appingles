import { test, expect } from '@playwright/test';
import { signup, completeOnboarding, SPEECH_MOCK_SCRIPT, uniqueEmail } from '../helpers/testUser';

test.describe('Flujo Día 1', () => {
  test('completa el día 1 completo (aprender → escuchar → pronunciar → practicar → hablar → reto → completado)', async ({ page }) => {
    await page.addInitScript(SPEECH_MOCK_SCRIPT);
    const email = uniqueEmail('day1');
    await signup(page, email);
    await completeOnboarding(page);

    // Empezar Día 1 desde el dashboard
    await page.getByRole('button', { name: /Empezar Día 1|Continuar Día 1/ }).first().click();
    await expect(page).toHaveURL(/\/day\/1/);
    await expect(page.getByRole('heading', { name: 'Presentaciones' })).toBeVisible();

    // Paso 1 — Aprender
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 — Escuchar
    await expect(page.getByRole('heading', { name: '👂 Escuchar' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 3 — Pronunciar
    await expect(page.getByRole('heading', { name: '🗣 Pronunciar' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 4 — Practicar (4 ejercicios)
    await expect(page.getByRole('heading', { name: '✏️ Practicar' })).toBeVisible();
    await expect(page.getByText('1 / 4')).toBeVisible();

    // Q1: mcq
    await page.getByRole('button', { name: 'Encantado de conocerte' }).click();
    await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
    await expect(page.getByText('2 / 4')).toBeVisible();

    // Q2: gapfill
    await page.getByRole('button', { name: 'am' }).click();
    await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
    await expect(page.getByText('3 / 4')).toBeVisible();

    // Q3: translate
    await page.getByPlaceholder('Escribe tu respuesta en inglés…').fill('I am from Colombia.');
    await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
    await expect(page.getByText('4 / 4')).toBeVisible();

    // Q4: order (My name is Maria)
    for (const word of ['My', 'name', 'is', 'Maria']) {
      await page.getByRole('button', { name: word, exact: true }).click();
    }
    await page.getByRole('button', { name: 'Comprobar respuesta' }).click();

    // Paso 5 — Hablar (con mock de voz)
    await expect(page.getByRole('heading', { name: '🎤 Hablar' })).toBeVisible();
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Pulsar para hablar' }).click();
      await expect(page.getByText('¡Muy bien!').first()).toBeVisible({ timeout: 10_000 });
    }
    const completarHabla = page.getByRole('button', { name: 'Completar práctica de habla' });
    await expect(completarHabla).toBeEnabled();
    await completarHabla.click();

    // Paso 6 — Reto
    await expect(page.getByRole('heading', { name: '⚡ Reto de la vida real' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 7 — Completado
    await expect(page.getByRole('heading', { name: '¡Día 1 completado!' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar al siguiente día' }).click();

    // Regresa al dashboard con el día guardado
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByText('1/21 días')).toBeVisible({ timeout: 30_000 });
  });
});