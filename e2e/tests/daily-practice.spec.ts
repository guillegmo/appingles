import { test, expect } from '@playwright/test';
import { signup, completeOnboarding, uniqueEmail } from '../helpers/testUser';

test.describe('Daily Practice (post-21)', () => {
  test('muestra mensaje amigable a un usuario que no completó el reto de 21 días', async ({ page }) => {
    const email = uniqueEmail('daily');
    await signup(page, email);
    await completeOnboarding(page);

    await page.goto('/daily');
    await expect(page.getByText('Práctica diaria no disponible')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Completa el reto de 21 días para desbloquear Daily Practice.')).toBeVisible();
  });
});