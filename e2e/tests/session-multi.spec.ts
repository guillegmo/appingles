import { test, expect } from '@playwright/test';
import { provisionUser, fillLogin, completeOnboarding, uniqueEmail, PASSWORD } from '../helpers/testUser';

// Sesión única entre dispositivos: cada contexto de Playwright es un "device"
// distinto (sessionStorage aislado -> sessionId propio).
test.describe('Sesión única multi-dispositivo', () => {
  test('el último dispositivo que inicia sesión queda activo y el anterior se expulsa', async ({ browser }) => {
    test.setTimeout(180_000);

    // -- Dispositivo A: primer login y onboarding (queda como sesión activa).
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    const email = uniqueEmail('multidev');
    await provisionUser(pageA, email, PASSWORD, 'QA Multi');
    await fillLogin(pageA, email, PASSWORD);
    await completeOnboarding(pageA);
    await expect(pageA).toHaveURL(/\/home/);
    await expect(pageA.getByText('0/21 días')).toBeVisible();

    // -- Dispositivo B: login con el MISMO usuario -> toma el control y queda activo.
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await fillLogin(pageB, email, PASSWORD);
    await expect(pageB).toHaveURL(/\/home/, { timeout: 60_000 });
    await expect(pageB.getByText('0/21 días')).toBeVisible();

    // -- B sigue siendo el último dispositivo activo tras recargar. Regresión del
    //    bug de sesión: en la restauración el gate no debe desviar a /onboarding a
    //    un usuario ya dado de alta solo porque progress llegue antes que challenge.
    await pageB.reload();
    await expect(pageB).toHaveURL(/\/home/, { timeout: 60_000 });
    await expect(pageB.getByText('0/21 días')).toBeVisible();

    // -- A: su siguiente petición recibe SESSION_EXPIRED -> expulsado a /login.
    await pageA.reload();
    await expect(pageA).toHaveURL(/\/login/, { timeout: 60_000 });

    // -- B sigue operativo tras la expulsión de A.
    await expect(pageB.getByText('0/21 días')).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});