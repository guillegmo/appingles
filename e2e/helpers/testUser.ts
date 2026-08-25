import { Page, expect } from '@playwright/test';

export const PASSWORD = 'PruebaE2E123!';

// Usuario premium real proporcionado por el usuario (solo lectura / flujos premium).
export const PREMIUM_USER = {
  email: 'guillegmo@hotmail.com',
  password: '123456',
};

// Clave pública web de Firebase Auth (la misma que usa el bundle del cliente).
// Sirve para crear usuarios de prueba vía la REST API de Identity Toolkit, ya
// que el registro por UI fue eliminado (las cuentas reales se crean desde Hotmart).
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAfcQfLkf-ZuugTjtEjvvhsWg6kbmwuG6U';

// API local que levanta el webServer de Playwright.
const API_BASE = process.env.API_URL || 'http://localhost:3001';

export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

// Mock de Web Speech Recognition: emite las frases objetivo del día en cada
// "start()", permitiendo superar el paso "Hablar" sin micrófono real.
export const SPEECH_MOCK_SCRIPT = `
  (() => {
    let idx = 0;
    const phrases = ['Hello my name is Maria', 'I am from Mexico', 'Nice to meet you'];
    class MockSR {
      constructor() { this.lang = ''; this.interimResults = false; this.continuous = false; }
      start() {
        const text = phrases[idx % phrases.length]; idx++;
        setTimeout(() => {
          if (this.onresult) this.onresult({ results: [{ 0: { transcript: text }, isFinal: true }] });
          if (this.onend) this.onend();
        }, 120);
      }
      stop() { if (this.onend) this.onend(); }
    }
    window.SpeechRecognition = MockSR;
    window.webkitSpeechRecognition = MockSR;
  })();
`;

// Crea un usuario nuevo en Firebase Auth (REST Identity Toolkit), equivalente a
// lo que antes hacía el registro por UI. Si se pasa `name`, actualiza el
// displayName para que el dashboard lo muestre. Reintenta ante throttling de
// Firebase (límite de creación de cuentas por IP/hora).
// Por defecto concede acceso de prueba (plan reto21) vía /api/access/dev-grant;
// con { grantAccess: false } el usuario queda SIN compra (para probar el gate).
export async function provisionUser(
  page: Page,
  email: string,
  password: string,
  name?: string,
  opts?: { grantAccess?: boolean },
): Promise<void> {
  const referer = { Referer: 'http://localhost:5173/' };
  let signUpBody: any = {};
  for (let attempt = 0; attempt < 3; attempt++) {
    const signUpRes = await page.request.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      { headers: referer, data: { email, password, returnSecureToken: true } },
    );
    signUpBody = await signUpRes.json().catch(() => ({}));
    // EMAIL_EXISTS: el usuario ya existía (colisión/reintento); no es un error fatal.
    if (signUpRes.ok() || signUpBody?.error?.message === 'EMAIL_EXISTS') break;
    if (signUpBody?.error?.message === 'TOO_MANY_ATTEMPTS_TRY_LATER' && attempt < 2) {
      await page.waitForTimeout(2000 * (attempt + 1));
      continue;
    }
    throw new Error(`No se pudo crear el usuario de prueba (${signUpBody?.error?.message})`);
  }
  if (name && signUpBody?.idToken) {
    await page.request.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
      { headers: referer, data: { idToken: signUpBody.idToken, displayName: name, returnSecureToken: true } },
    );
  }
  // La app ahora exige compra activa (gate de acceso). Concedemos acceso de
  // prueba al usuario recién creado vía el endpoint dev del backend local.
  if ((opts?.grantAccess ?? true) && signUpBody?.idToken) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const grantRes = await page.request.post(`${API_BASE}/api/access/dev-grant`, {
        headers: { Authorization: `Bearer ${signUpBody.idToken}` },
        data: { plan: 'reto21' },
      });
      if (grantRes.ok()) break;
      await page.waitForTimeout(1500 * (attempt + 1));
    }
  }
}

// Provisiona un usuario fresco y entra por la UI (email + contraseña). Deja al
// usuario en el login en curso: quien lo llame decide qué esperar (onboarding, etc.).
export async function signup(page: Page, email: string, name = 'QA E2E'): Promise<void> {
  await provisionUser(page, email, PASSWORD, name);
  await fillLogin(page, email, PASSWORD);
}

export async function completeOnboarding(page: Page): Promise<void> {
  // Timeout generoso: con Firebase real el alta de usuario puede tardar bastante
  // (throttling tras muchos registros de prueba), y el onboarding espera a que
  // el backend devuelva challenge + progress antes de redirigir.
  await expect(page.getByRole('heading', { name: 'Tu objetivo' })).toBeVisible({ timeout: 120_000 });

  const goalBtn = page.getByRole('button', { name: /Aprender inglés para viajar/ });
  const levelBtn = page.getByRole('button', { name: 'Sé muy pocas palabras' });
  const startBtn = page.getByRole('button', { name: /Comenzar Día 1|Continuar mi progreso/ });

  // La pantalla de onboarding puede re-montarse mientras terminan de cargar
  // challenge/progress, reseteando el estado local (goal/level). Se reintenta la
  // selección hasta que el botón de inicio quede habilitado, en lugar de fallar
  // si el primer click no dejó el estado listo.
  for (let attempt = 0; attempt < 4; attempt++) {
    await goalBtn.click();
    await levelBtn.click();
    try {
      await expect(startBtn).toBeEnabled({ timeout: 3_000 });
      break;
    } catch {
      if (attempt === 3) throw new Error('El botón de inicio del onboarding no se habilitó tras varios intentos');
    }
  }

  await startBtn.click();
  await expect(page.getByText(/Tu (Reto de Inglés en 21 Días|ruta de inglés)/)).toBeVisible({ timeout: 60_000 });
}

// Navega al login y llena credenciales sin esperar la redirección (quien lo
// llame decide qué esperar).
export async function fillLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder('tu@email.com').fill(email);
  await page.getByPlaceholder('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar mi reto' }).click();
}

export async function login(page: Page, email: string): Promise<void> {
  await fillLogin(page, email, PASSWORD);
}

// Cambia de usuario: cierra sesión si hay una activa y luego inicia con las
// credenciales dadas. Evita que /login redirija a /home por sesión existente.
export async function switchUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/profile');
  const hasSession = await page.evaluate(() => !!sessionStorage.getItem('appingles_user'));
  if (hasSession) {
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login/);
  }
  await fillLogin(page, email, password);
}

export async function loginPremium(page: Page): Promise<void> {
  await switchUser(page, PREMIUM_USER.email, PREMIUM_USER.password);
  await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
}

export async function logout(page: Page): Promise<void> {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login/);
}

// Registra y deja al usuario autenticado y con onboarding completo en /home.
export async function newOnboardedUser(page: Page, prefix = 'e2e'): Promise<string> {
  const email = uniqueEmail(prefix);
  await signup(page, email);
  await completeOnboarding(page);
  return email;
}

// Colecciona errores de consola (críticos) y errores de página no capturados.
// Devuelve el arreglo de errores para inspección/assert.
export function collectErrors(page: Page): { errors: string[]; pageErrors: string[] } {
  const errors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  return { errors, pageErrors };
}

// Lee el token del sessionStorage y devuelve headers listos para API (request fixture).
export async function authHeaders(page: Page): Promise<Record<string, string>> {
  const token = await page.evaluate('sessionStorage.getItem("appingles_token")');
  return token ? { Authorization: `Bearer ${token}` } : {};
}