// hotmart-flow.spec.ts
// Flujo completo de compra externa (Fase 15/21):
//   Webhook Hotmart simulado (firmado) → usuario creado en Firebase Auth →
//   email dry-run con enlace seguro → /activar crea contraseña → login → app.
// No se envían correos reales ni se ejecutan compras reales.
import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHmac } from 'crypto';
import { uniqueEmail, PASSWORD, fillLogin } from '../helpers/testUser';

const API = process.env.API_URL || 'http://localhost:3001';

// Lee HOTMART_WEBHOOK_SECRET del .env local del backend (si existe) para firmar
// la petición igual que lo haría Hotmart.
function hotmartSecret(): string {
  const envPath = join(__dirname, '../../api/.env');
  if (!existsSync(envPath)) return '';
  const match = readFileSync(envPath, 'utf8').match(/^HOTMART_WEBHOOK_SECRET=(.*)$/m);
  return match ? match[1].trim() : '';
}

async function sendWebhook(request: import('@playwright/test').APIRequestContext, payload: unknown) {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = hotmartSecret();
  if (secret) headers['x-hotmart-signature'] = createHmac('sha256', secret).update(body).digest('hex');
  return request.post(`${API}/webhooks/hotmart`, { headers, data: body });
}

function purchaseApproved(email: string, tx: string) {
  return {
    event: 'PURCHASE_APPROVED',
    data: {
      buyer: { email, name: 'Comprador E2E' },
      product: { id: '900001', name: 'Reto de Inglés en 21 Días' },
      purchase: { transaction: tx, status: 'approved', recurrency_number: 1 },
    },
  };
}

test.describe('Hotmart → Activación → Acceso', () => {
  test('HT-001 compra aprobada activa cuenta: webhook → email → contraseña → login', async ({ page, request }) => {
    test.setTimeout(180_000);
    const email = uniqueEmail('hotmart');
    const tx = `E2E-${Date.now()}`;

    // 1. Compra aprobada llega por webhook (firmado).
    const res = await sendWebhook(request, purchaseApproved(email, tx));
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.applied).toBe(true);
    expect(body.created).toBe(true);

    // 2. El backend generó el enlace de activación (email dry-run auditable).
    const outboxRes = await request.get(`${API}/api/access/dev-outbox?email=${encodeURIComponent(email)}`);
    expect(outboxRes.status()).toBe(200);
    const outbox = await outboxRes.json();
    expect(outbox.items.length).toBeGreaterThanOrEqual(1);
    expect(String(outbox.items[0].link)).toContain('activar');

    // 3. El usuario abre el enlace seguro → NUESTRA página de activación
    //    (ya no pasa por la página alojada de Firebase).
    await page.goto(outbox.items[0].link);
    await expect(page).toHaveURL(/\/activar/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Activa tu acceso a AppIngles' })).toBeVisible();

    // 4. Crea su contraseña (reglas: mayúscula, minúscula, número, especial, ≥8).
    await page.getByLabel('Nueva contraseña').fill(PASSWORD);
    await page.getByLabel('Confirmar contraseña').fill(PASSWORD);

    // 5. Crea la contraseña y entra INMEDIATAMENTE (login automático).
    await page.getByRole('button', { name: 'Crear mi contraseña y entrar' }).click();
    // Gate superado: la compra activa del webhook le da paso al onboarding.
    await expect(page).toHaveURL(/\/onboarding|\/home/, { timeout: 60_000 });
  });

  test('HT-002 usuario autenticado sin compra no entra al contenido protegido', async ({ page }) => {
    test.setTimeout(120_000);
    const { provisionUser } = await import('../helpers/testUser');
    const email = uniqueEmail('sinacceso');
    await provisionUser(page, email, PASSWORD, 'Sin Compra', { grantAccess: false });

    await fillLogin(page, email, PASSWORD);
    // Autenticado pero sin compra: redirigido fuera del contenido protegido.
    await expect(page).toHaveURL(/\/sin-acceso/, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: 'Tu acceso aún no está activo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Solicitar enlace de activación' })).toBeVisible();
  });

  test('HT-003 enlace inválido muestra mensaje claro y opción de reenvío', async ({ page }) => {
    // oobCode inválido: se detecta al validar el enlace y se muestra el estado de error.
    await page.goto('/activar?oobCode=codigo-falso');
    await expect(page.getByText('Este enlace ya no es válido')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('link', { name: 'Solicitar un nuevo enlace' }).click();
    await expect(page).toHaveURL(/\/activar-acceso/);
    await expect(page.getByPlaceholder('tu@email.com')).toBeVisible();
  });

  test('HT-004 reenvío desde /activar-acceso responde siempre genérico', async ({ page, request }) => {
    const email = uniqueEmail('reenvio');
    // Sembramos una compra para ese email para probar la rama "sí envía".
    const res = await sendWebhook(request, purchaseApproved(email, `E2E-RS-${Date.now()}`));
    expect(res.status()).toBe(200);

    await page.goto('/activar-acceso');
    await page.getByPlaceholder('tu@email.com').fill(email);
    await page.getByRole('button', { name: 'Enviarme el enlace' }).click();
    await expect(page.getByText('Revisa tu correo')).toBeVisible({ timeout: 30_000 });

    // El reenvío registró un segundo email en la outbox (original + reenvío).
    const outboxRes = await request.get(`${API}/api/access/dev-outbox?email=${encodeURIComponent(email)}`);
    const outbox = await outboxRes.json();
    expect(outbox.items.length).toBeGreaterThanOrEqual(2);
  });
});
