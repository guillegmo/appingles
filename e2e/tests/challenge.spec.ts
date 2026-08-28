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

  test('CH-005 Campeón: completar los 21 días desbloquea el post-21', async ({ page, request }) => {
    await newOnboardedUser(page, 'ch5');
    const token = await tokenFromPage(page);
    const session = await sessionFromPage(page);
    const api = apiAuthed(request, '', token, session);

    // Completa los 21 días por API (rápido y sin repetir XP en cada uno).
    let xp = 0;
    for (let n = 1; n <= 21; n++) {
      const { res, body } = await api.post(`/challenge/day/${n}/complete`, {});
      expect(res.status()).toBe(200);
      expect(body.dayCompleted).toBe(n);
      expect(body.xpEarned).toBeGreaterThan(0); // primer completado de cada día
      xp += body.xpEarned;
    }
    expect(xp).toBeGreaterThan(0);

    // El índice refleja los 21 días completados y sin bloqueos.
    const { body: idx } = await api.get('/challenge');
    expect(idx.days.length).toBe(21);
    expect(idx.days.every((d: { completed: boolean; locked: boolean }) => d.completed && !d.locked)).toBe(true);

    // Progreso global: 21/21, XP acumulada, insignia de campeón.
    const { body: prog } = await api.get('/challenge/progress');
    expect(prog.daysCompleted).toBe(21);
    expect(prog.completedDays).toHaveLength(21);
    expect(prog.totalXp).toBe(xp);
    expect(prog.badges).toContain('champion-21');

    // Post-21 desbloqueado: assessment y Daily Practice (403 para no campeones).
    const assessment = await api.get('/challenge/assessment');
    expect(assessment.res.status()).toBe(200);
    expect(assessment.body).toBeTruthy();
    const daily = await api.get('/practice/today');
    expect(daily.res.status()).toBe(200);
    expect(daily.body.mission).toBeTruthy();

    // UI: el dashboard muestra el reto al 100%.
    await page.goto('/home');
    await expect(page.getByText('21/21 días')).toBeVisible({ timeout: 30_000 });
  });
});