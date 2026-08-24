import { test, expect } from '@playwright/test';
import { signup, completeOnboarding, uniqueEmail, collectErrors } from '../helpers/testUser';

test.describe('Dashboard', () => {
  test('DASH-001 muestra datos del usuario, día actual y misión', async ({ page }) => {
    const errors = collectErrors(page);
    const email = uniqueEmail('dash');
    await signup(page, email, 'QA Dashboard');
    await completeOnboarding(page);

    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByRole('heading', { name: 'QA Dashboard' })).toBeVisible();
    await expect(page.getByText('Tu ruta de inglés')).toBeVisible();
    await expect(page.getByText('La misión de hoy')).toBeVisible();
    await expect(page.getByText('Día 1', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Empezar Día 1' })).toBeVisible();

    // Métricas iniciales en cero
    await expect(page.getByRole('link', { name: '0 días' })).toBeVisible();

    // La ruta de 21 días se renderiza (primera semana y último día)
    await expect(page.getByText('Semana 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Semana 3', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Día 21' })).toBeVisible();
    expect(errors.pageErrors).toHaveLength(0);
  });

  test('DASH-002 navega al centro de práctica desde el dashboard', async ({ page }) => {
    const email = uniqueEmail('dash2');
    await signup(page, email);
    await completeOnboarding(page);
    await page.goto('/practice');
    await expect(page.getByRole('heading', { name: 'Practicar' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Práctica rápida/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Repaso inteligente/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Memory Match/ })).toBeVisible();
  });
});