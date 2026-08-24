import { test, expect } from '@playwright/test';
import { signup, completeOnboarding, uniqueEmail } from '../helpers/testUser';

async function noHorizontalOverflow(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
}

test.describe('Responsive', () => {
  test('RESP-001 login sin overflow horizontal en móvil (390×844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.getByPlaceholder('tu@email.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('RESP-002 dashboard sin overflow horizontal en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const email = uniqueEmail('resp');
    await signup(page, email);
    await completeOnboarding(page);
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByText('Tu ruta de inglés')).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('RESP-003 vista de día sin overflow horizontal en tablet (768×1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const email = uniqueEmail('resp3');
    await signup(page, email);
    await completeOnboarding(page);
    await page.getByRole('button', { name: 'Empezar Día 1' }).click();
    await expect(page).toHaveURL(/\/day\/1/);
    await expect(page.getByRole('heading', { name: 'Presentaciones' })).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
  });

  test('RESP-004 centro de práctica usable en escritorio (1440×900)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const email = uniqueEmail('resp4');
    await signup(page, email);
    await completeOnboarding(page);
    await page.goto('/practice');
    await expect(page.getByRole('button', { name: /Práctica rápida/ })).toBeVisible();
    expect(await noHorizontalOverflow(page)).toBe(true);
  });
});