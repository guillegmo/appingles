import { test, expect } from '@playwright/test';
import { loginPremium, newOnboardedUser, collectErrors } from '../helpers/testUser';

test.describe('Tutor IA', () => {
  test('AI-001 el tutor carga con modos y entrada de texto (Premium)', async ({ page }) => {
    await loginPremium(page);
    await page.goto('/tutor');
    await expect(page.getByRole('heading', { name: /Tutor IA/ })).toBeVisible({ timeout: 30_000 });
    for (const label of ['Conversation', 'Roleplay', 'Correction', 'Pronunciation', 'Vocabulary', 'Grammar', 'Interview', 'Travel']) {
      await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Estoy Atascado' })).toBeVisible();
    await expect(page.getByPlaceholder('Responde en inglés… (español si te atascas)')).toBeVisible();
    await expect(page.getByText(/Ilimitado|mensajes hoy/)).toBeVisible();
  });

  test('AI-002 enviar un mensaje responde o muestra error elegante (sin crash)', async ({ page }) => {
    const { pageErrors } = collectErrors(page);
    await loginPremium(page);
    await page.goto('/tutor');
    const input = page.getByPlaceholder('Responde en inglés… (español si te atascas)');
    await expect(input).toBeVisible({ timeout: 30_000 });

    await input.fill('Hello tutor!');
    await input.press('Enter');

    // O el tutor responde (burbuja del asistente) o muestra un error manejado.
    const replied = page.locator('text=escuchar').first();
    const gracefulError = page.getByText(/El tutor no respondió|Alcanzaste tu límite diario/).first();
    await Promise.race([
      replied.waitFor({ timeout: 60_000 }),
      gracefulError.waitFor({ timeout: 60_000 }),
    ]);
    expect(pageErrors).toHaveLength(0);
  });

  test('AI-003 un usuario Free ve el banner de límite de mensajes', async ({ page }) => {
    await newOnboardedUser(page, 'tutor3');
    await page.goto('/tutor');
    await expect(page.getByRole('heading', { name: /Tutor IA/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/mensajes IA gratis hoy/)).toBeVisible();
    await expect(page.getByText(/mensajes hoy/)).toBeVisible();
  });
});