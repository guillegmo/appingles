import { test, expect } from '@playwright/test';
import { signup, completeOnboarding, uniqueEmail } from '../helpers/testUser';

test.describe('Centro de práctica', () => {
  test('muestra el hub de herramientas y no repite la lista de 21 días', async ({ page }) => {
    const email = uniqueEmail('practice');
    await signup(page, email);
    await completeOnboarding(page);

    await page.goto('/practice');

    // Hub con las herramientas de práctica (timeout generoso: con Firebase real
    // el boot tras navegación completa puede tardar varios segundos)
    await expect(page.getByRole('heading', { name: 'Practicar' })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('La misión de hoy')).toBeVisible();
    await expect(page.getByRole('button', { name: /Práctica rápida/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Repaso inteligente/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Vocabulario/ })).toBeVisible();

    // La lista de 21 días ya NO está en Practicar (vive en Inicio)
    await expect(page.getByText('Mi primer reto')).toHaveCount(0);
    await expect(page.getByText('Semana 1 ·')).toHaveCount(0);
    await expect(page.getByText('Semana 2 ·')).toHaveCount(0);
  });

  test('práctica rápida sirve los ejercicios del día actual', async ({ page }) => {
    const email = uniqueEmail('quick');
    await signup(page, email);
    await completeOnboarding(page);

    await page.goto('/practice');
    await expect(page.getByRole('heading', { name: 'Practicar' })).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: /Práctica rápida/ }).click();

    await expect(page).toHaveURL(/\/practice\/quick/);
    await expect(page.getByRole('heading', { name: 'Práctica rápida', level: 1 })).toBeVisible();
    await expect(page.getByText('1 / 4')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Comprobar respuesta' })).toBeVisible();
  });
});
