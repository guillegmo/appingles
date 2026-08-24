import { test, expect } from '@playwright/test';
import { signup, uniqueEmail } from '../helpers/testUser';

test.describe('Onboarding', () => {
  test('ONB-001 finalizar onboarding lleva al dashboard y persiste', async ({ page }) => {
    const email = uniqueEmail('onb1');
    await signup(page, email);
    await expect(page.getByRole('heading', { name: 'Tu objetivo' })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Aprender inglés para viajar/ }).click();
    await page.getByRole('button', { name: 'Sé muy pocas palabras' }).click();
    await page.getByRole('button', { name: 'Empezar Día 1' }).click();
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByText('Tu ruta de inglés')).toBeVisible({ timeout: 30_000 });

    // Persistencia: recargar NO vuelve a pedir onboarding
    await page.reload();
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByText('Tu ruta de inglés')).toBeVisible({ timeout: 30_000 });
  });

  test('ONB-002 el botón de continuar está deshabilitado sin objetivo y nivel', async ({ page }) => {
    const email = uniqueEmail('onb2');
    await signup(page, email);
    await expect(page.getByRole('heading', { name: 'Tu objetivo' })).toBeVisible({ timeout: 30_000 });

    const submit = page.getByRole('button', { name: 'Empezar Día 1' });
    await expect(submit).toBeDisabled();

    // Solo objetivo (sin nivel) sigue deshabilitado
    await page.getByRole('button', { name: /Mejorar mis conversaciones/ }).click();
    await expect(submit).toBeDisabled();

    // Nivel seleccionado → habilitado
    await page.getByRole('button', { name: 'Puedo decir frases básicas' }).click();
    await expect(submit).toBeEnabled();
  });

  test('ONB-003 onboarding guarda objetivo y nivel en el backend', async ({ page }) => {
    const email = uniqueEmail('onb3');
    await signup(page, email);
    await expect(page.getByRole('heading', { name: 'Tu objetivo' })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /Trabajar en inglés/ }).click();
    await page.getByRole('button', { name: 'Puedo tener conversaciones simples' }).click();
    await page.getByRole('button', { name: 'Empezar Día 1' }).click();
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByText('Tu ruta de inglés')).toBeVisible({ timeout: 30_000 });
  });
});