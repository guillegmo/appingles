import { test, expect } from '@playwright/test';
import { signup, completeOnboarding, login, logout, uniqueEmail, PREMIUM_USER, collectErrors } from '../helpers/testUser';

test.describe('Autenticación', () => {
  test('AUTH-001 registro + onboarding + dashboard', async ({ page }) => {
    const email = uniqueEmail('auth');
    await signup(page, email);
    await completeOnboarding(page);
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByText(/Tu (Reto de Inglés en 21 Días|ruta de inglés)/)).toBeVisible();
  });

  test('AUTH-002 login correcto restaura el dashboard', async ({ page }) => {
    const email = uniqueEmail('auth2');
    await signup(page, email);
    await completeOnboarding(page);
    await logout(page);
    await login(page, email);
    await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
    await expect(page.getByText(/Tu (Reto de Inglés en 21 Días|ruta de inglés)/)).toBeVisible({ timeout: 30_000 });
  });

  test('AUTH-003 login con credenciales incorrectas muestra error', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill(uniqueEmail('nouser'));
    await page.getByPlaceholder('Contraseña').fill('password-invalida');
    await page.getByRole('button', { name: 'Iniciar mi reto' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('AUTH-004 logout redirige a /login y no permite reingreso directo', async ({ page }) => {
    const email = uniqueEmail('auth4');
    await signup(page, email);
    await completeOnboarding(page);
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
    // Tras logout no se puede entrar directo a una ruta protegida
    await page.goto('/home');
    await expect(page).toHaveURL(/\/login/);
  });

  test('AUTH-005 rutas protegidas redirigen a /login sin sesión', async ({ page }) => {
    for (const path of ['/home', '/practice', '/progress', '/tutor', '/profile', '/day/1']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    }
  });

  test('AUTH-006 la sesión persiste tras refresh', async ({ page }) => {
    const email = uniqueEmail('auth6');
    await signup(page, email);
    await completeOnboarding(page);
    await page.reload();
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByText(/Tu (Reto de Inglés en 21 Días|ruta de inglés)/)).toBeVisible({ timeout: 30_000 });
  });

  test('AUTH-007 el usuario premium proporcionado inicia sesión', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/login');
    await page.getByPlaceholder('tu@email.com').fill(PREMIUM_USER.email);
    await page.getByPlaceholder('Contraseña').fill(PREMIUM_USER.password);
    await page.getByRole('button', { name: 'Iniciar mi reto' }).click();
    await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
    await expect(page.getByText(/Tu (Reto de Inglés en 21 Días|ruta de inglés)/)).toBeVisible({ timeout: 30_000 });
    expect(errors.pageErrors).toHaveLength(0);
  });
});