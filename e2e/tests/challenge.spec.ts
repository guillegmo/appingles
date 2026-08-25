import { test, expect } from '@playwright/test';
import { newOnboardedUser } from '../helpers/testUser';
import { apiAuthed, tokenFromPage, sessionFromPage } from '../helpers/apiClient';

test.describe('Reto de 21 días', () => {
  test('CH-001 Día 1 está disponible desde el dashboard y navega', async ({ page }) => {
    await newOnboardedUser(page, 'ch1');

    await page.getByRole('button', { name: 'Comenzar Día 1' }).click();
    await expect(page).toHaveURL(/\/day\/1/);
    await expect(page.getByRole('heading', { name: 'Presentaciones' })).toBeVisible();
    await expect(page.getByText('Estación 1 de 21')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();
  });

  test('CH-002 los días posteriores NO están bloqueados para un usuario nuevo (hallazgo)', async ({ page, request }) => {
    await newOnboardedUser(page, 'ch2');
    const token = await tokenFromPage(page);
    const session = await sessionFromPage(page);

    const api = apiAuthed(request, '', token, session);
    const { res, body } = await api.get('/challenge');
    expect(res.status()).toBe(200);
    expect(body.days).toHaveLength(21);
    // Hallazgo: la regla de desbloqueo secuencial NO está implementada.
    // Todos los días <= 21 tienen locked=false para usuarios nuevos.
    const day5 = body.days.find((d: { day: number }) => d.day === 5);
    expect(day5.locked).toBe(false);

    // Acceso directo a un día posterior sin completar el día 1
    await page.goto('/day/5');
    await expect(page.getByRole('heading', { name: 'Hacer preguntas' })).toBeVisible({ timeout: 30_000 });
  });

  test('CH-003 completar un día por API persiste en el progreso', async ({ page, request }) => {
    await newOnboardedUser(page, 'ch3');
    const token = await tokenFromPage(page);
    const session = await sessionFromPage(page);
    const api = apiAuthed(request, '', token, session);

    const { res: completeRes, body: completeBody } = await api.post('/challenge/day/1/complete', {});
    expect(completeRes.status()).toBe(200);
    expect(completeBody.dayCompleted).toBe(1);
    expect(completeBody.totalXp).toBeGreaterThan(0);
    expect(completeBody.badges).toBeDefined();

    const { res: progRes, body: progBody } = await api.get('/challenge/progress');
    expect(progRes.status()).toBe(200);
    expect(progBody.daysCompleted).toBe(1);
    expect(progBody.completedDays).toContain(1);
  });

  test('CH-004 completar el mismo día dos veces no duplica XP', async ({ page, request }) => {
    await newOnboardedUser(page, 'ch4');
    const token = await tokenFromPage(page);
    const session = await sessionFromPage(page);
    const api = apiAuthed(request, '', token, session);

    const first = await api.post('/challenge/day/1/complete', {});
    expect(first.body.xpEarned).toBeGreaterThan(0);

    const second = await api.post('/challenge/day/1/complete', {});
    expect(second.res.status()).toBe(200);
    expect(second.body.xpEarned).toBe(0); // sin duplicar XP
  });
});