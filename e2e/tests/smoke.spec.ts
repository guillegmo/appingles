import { test, expect } from '@playwright/test';

test.describe('Smoke', () => {
  test('la app carga y el login muestra los elementos principales', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Inglés en 21 Días/);
    await expect(page.getByRole('heading', { name: 'Inglés en 21 Días' })).toBeVisible();
    await expect(page.getByPlaceholder('tu@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('una ruta protegida redirige a /login sin sesión', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/\/login/);
  });
});
