import { test, expect } from '@playwright/test';
import { newOnboardedUser, loginPremium } from '../helpers/testUser';
import { apiAuthed, tokenFromPage, sessionFromPage } from '../helpers/apiClient';

test.describe('Premium / Entitlements', () => {
  test('PREM-001 un usuario Free ve el paywall con planes', async ({ page }) => {
    await newOnboardedUser(page, 'prem1');
    await page.goto('/premium');
    await expect(page.getByRole('heading', { name: 'APPINGLES PREMIUM' })).toBeVisible();
    await expect(page.getByText('Tu aprendizaje personalizado con IA.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Empezar con AppIngles Premium/ })).toBeVisible();
    await expect(page.getByText('Mensual', { exact: true })).toBeVisible();
    await expect(page.getByText('Mejor valor')).toBeVisible();
    // Precios del modelo freemium actual ($4.99/mes, $39.99/año).
    await expect(page.getByText('$4.99')).toBeVisible();
    await expect(page.getByText('$39.99')).toBeVisible();
    // El botón "Volver sin comprar" (aria-label="Volver") permite salir del paywall.
    // Nota: el aria-label "Volver" sobrescribe el texto visible en el nombre
    // accesible → hallazgo menor de accesibilidad.
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/home/);
  });

  test('PREM-002 el usuario premium proporcionado ve el estado Premium', async ({ page }) => {
    await loginPremium(page);
    await page.goto('/premium');
    await expect(page.getByRole('heading', { name: '¡Ya eres Premium IA!' })).toBeVisible();
    await expect(page.getByText(/Tu suscripción/)).toBeVisible();
  });

  test('PREM-003 entitlements: free vs premium desde API', async ({ page, request }) => {
    await newOnboardedUser(page, 'prem3');
    const tokenFree = await tokenFromPage(page);
    const sessionFree = await sessionFromPage(page);
    const apiFree = apiAuthed(request, '', tokenFree, sessionFree);
    const { res: freeRes, body: freeBody } = await apiFree.get('/subscription/status');
    expect(freeRes.status()).toBe(200);
    // Con el gate de acceso, provisionUser concede plan 'reto21' (compra única):
    // la suscripción queda 'active' pero los ENTITLEMENTS son de tier free.
    expect(freeBody.subscription.plan).toBe('reto21');
    expect(freeBody.subscription.status).toBe('active');
    expect(freeBody.entitlements.plan).toBe('free');
    expect(freeBody.entitlements.canUseVocabularyBank).toBe(false);
    expect(freeBody.entitlements.canScorePronunciation).toBe(false);

    await loginPremium(page);
    const tokenPrem = await tokenFromPage(page);
    const sessionPrem = await sessionFromPage(page);
    const apiPrem = apiAuthed(request, '', tokenPrem, sessionPrem);
    const { res: premRes, body: premBody } = await apiPrem.get('/subscription/status');
    expect(premRes.status()).toBe(200);
    expect(premBody.entitlements.plan).toBe('premium');
    expect(premBody.entitlements.canUseVocabularyBank).toBe(true);
    expect(premBody.entitlements.canScorePronunciation).toBe(true);
  });

  test('PREM-004 pronunciación (Premium IA) bloqueada para Free, disponible para Premium', async ({ page, request }) => {
    await newOnboardedUser(page, 'prem4');
    const tokenFree = await tokenFromPage(page);
    const sessionFree = await sessionFromPage(page);
    const apiFree = apiAuthed(request, '', tokenFree, sessionFree);
    const { res: freeRes, body: freeBody } = await apiFree.post('/exercises/pronunciation', {
      transcript: 'hello',
      target: 'hello',
    });
    expect(freeRes.status()).toBe(403);
    expect(freeBody.error).toBe('premium_required');

    await loginPremium(page);
    const tokenPrem = await tokenFromPage(page);
    const sessionPrem = await sessionFromPage(page);
    const apiPrem = apiAuthed(request, '', tokenPrem, sessionPrem);
    const { res: premRes } = await apiPrem.post('/exercises/pronunciation', {
      transcript: 'hello',
      target: 'hello',
    });
    expect(premRes.status()).toBe(200);
  });
});