import { test, expect } from '@playwright/test';
import { signup, completeOnboarding, uniqueEmail } from '../helpers/testUser';

test.describe('Memory Match Game', () => {
  test('MEM-001 navega, juega una partida libre 4×4 y guarda el resultado', async ({ page }) => {
    const email = uniqueEmail('memory');
    await signup(page, email);
    await completeOnboarding(page);

    // Ir al centro de práctica → Memory Match
    await page.goto('/practice');
    await expect(page.getByRole('heading', { name: 'Practicar' })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Memory Match/ }).click();
    await expect(page).toHaveURL(/\/practice\/memory\/menu/);
    await expect(page.getByRole('heading', { name: 'Memory Match' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Desafío diario' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Partida libre' })).toBeVisible();

    // Seleccionar "Partida libre" → aparece la CTA "Seleccionar dificultad"
    await page.getByRole('button', { name: 'Partida libre' }).click();
    await expect(page.getByRole('button', { name: 'Seleccionar dificultad' })).toBeVisible();
    // La dificultad solo se muestra tras pulsar la CTA
    await expect(page.getByRole('button', { name: 'Fácil (4×4)' })).toBeHidden();
    await page.getByRole('button', { name: 'Seleccionar dificultad' }).click();
    await expect(page.getByRole('button', { name: 'Fácil (4×4)' })).toBeVisible();
    await page.getByRole('button', { name: 'Fácil (4×4)' }).click();

    await expect(page).toHaveURL(/\/practice\/memory\?mode=free&size=4x4/);
    await expect(page.getByRole('heading', { name: 'Memory Match' })).toBeVisible();
    await expect(page.locator('[role="grid"]')).toBeVisible();
    // Deja que el tablero termine de asentarse (StrictMode en dev dobla la carga)
    await page.waitForTimeout(600);

    // Jugar: emparejar las 8 parejas (EN ↔ ES). El contador de pares resueltos
    // confirma que cada pareja quedó emparejada (espera explícita, no timeout).
    for (let i = 0; i < 8; i++) {
      const cardEn = page.getByTestId(`memory-card-p${i}-en`);
      const cardEs = page.getByTestId(`memory-card-p${i}-es`);
      await expect(cardEn).toBeVisible();
      await expect(cardEs).toBeVisible();
      await cardEn.click();
      // Pequeña pausa para que el estado del primer volteo se confirme antes del segundo
      await page.waitForTimeout(150);
      await cardEs.click();
      await expect(page.getByText(`${i + 1} / 8 pares`)).toBeVisible({ timeout: 6_000 });
    }

    // Modal de partida completada
    await expect(page.getByRole('heading', { name: '¡Completado!' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('XP total')).toBeVisible();

    // Volver al menú y verificar estadísticas actualizadas
    await page.getByRole('button', { name: 'Menú' }).click();
    await expect(page).toHaveURL(/\/practice\/memory\/menu/);
    await expect(page.getByText('Tus estadísticas')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Partidas')).toBeVisible();
  });
});