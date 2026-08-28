# QA TEST PLAN — AppIngles

Matriz de cobertura y estrategia de pruebas Playwright.

## Matriz

| ID        | Área       | Flujo                      | Prioridad | Tipo        | Estado   |
| --------- | ---------- | -------------------------- | --------- | ----------- | -------- |
| AUTH-001  | Auth       | Registro (signup)          | Critical  | E2E         | Pending  |
| AUTH-002  | Auth       | Login correcto             | Critical  | E2E         | Pending  |
| AUTH-003  | Auth       | Login credenciales inválidas | Critical | E2E        | Pending  |
| AUTH-004  | Auth       | Logout                     | Critical  | E2E         | Pending  |
| AUTH-005  | Auth       | Rutas protegidas sin sesión | Critical | E2E        | Pending  |
| AUTH-006  | Auth       | Sesión persiste tras refresh | Critical | E2E       | Pending  |
| ONB-001   | Onboarding | Completo → dashboard       | Critical  | E2E         | Pending  |
| ONB-002   | Onboarding | Validación (botón deshabilitado) | High | E2E      | Pending  |
| DASH-001  | Dashboard | Datos del usuario + día actual | Critical | E2E     | Pending  |
| CH-001    | Challenge  | Día 1 bloqueado/desbloqueado | Critical | E2E       | Pending  |
| CH-002    | Challenge  | Día 2 bloqueado antes de completar Día 1 | Critical | E2E | Pending |
| DAY-001   | Challenge  | Flujo completo Día 1 (todos los pasos) | Critical | E2E | Pending |
| EX-001    | Ejercicios | mcq correcta/incorrecta    | High      | E2E         | Pending  |
| EX-002    | Ejercicios | gapfill correcta/incorrecta | High     | E2E         | Pending  |
| EX-003    | Ejercicios | translate correcta/incorrecta | High   | E2E         | Pending  |
| EX-004    | Ejercicios | order correcta/incorrecta  | High      | E2E         | Pending  |
| EX-005    | Ejercicios | API attempt con fallo → NO 500 (BUG-001) | Critical | API | Pending |
| SPK-001   | Speaking   | Hablar con mock de voz     | High      | E2E (mock)  | Pending  |
| PROG-001  | Progreso   | Completar actividad → XP/días persiste tras refresh | Critical | E2E | Pending |
| PROG-002  | Progreso   | Progreso persiste tras logout/login | Critical | E2E | Pending |
| SR-001     | Smart Review | Repaso con tarjetas (due/difficult) | High | E2E | Pending |
| SR-002     | Smart Review | POST result no 500 (BUG-002) | High | API | Pending |
| AI-001     | Tutor IA   | Modos + conversación básica | High      | E2E         | Pending  |
| PREM-001   | Premium    | Usuario Free → gating       | Critical  | E2E         | Pending  |
| PREM-002   | Premium    | Usuario Premium (guillegmo) → acceso | Critical | E2E | Pending |
| PREM-003   | Premium    | Entitlements desde API      | High      | API         | Pending  |
| SUB-001    | Suscripción| Paywall muestra planes      | High      | E2E         | Pending  |
| PROF-001   | Perfil     | Datos + logout             | High      | E2E         | Pending  |
| RESP-001   | Responsive | Dashboard sin overflow en mobile | Medium | E2E      | Pending  |
| RESP-002   | Responsive | Login usable en mobile     | Medium    | E2E         | Pending  |
| CONS-001   | Consola    | Sin errores críticos en flujos clave | Medium | E2E   | Pending  |
| MEM-001    | Memory     | Partida libre completa      | High      | E2E         | Pending  |

## Estrategia

### Organización
```
e2e/tests/
├── auth.spec.ts          (ampliado: registro, login, logout, protegidas, sesión)
├── onboarding.spec.ts
├── dashboard.spec.ts
├── challenge.spec.ts     (desbloqueo + Día 1 + persistencia)
├── exercises.spec.ts     (tipos + API attempt)
├── smart-review.spec.ts  (tarjetas + API result)
├── premium.spec.ts       (Free vs Premium + paywall)
├── tutor.spec.ts         (Tutor IA)
├── memory.spec.ts        (reemplaza memory-game.spec.ts)
├── responsive.spec.ts    (mobile smoke)
└── api.spec.ts           (tests API directos con request fixture)
```

### Usuarios
- **Nuevos** por test: `signup()` con email único (crea usuario real Firebase; no destructivo).
- **Premium**: `guillegmo@hotmail.com` / `123456` (proporcionado por el usuario). Solo lectura / flujos premium.
- No eliminar datos.

### Fixtures / helpers
- `helpers/testUser.ts`: ampliar con `loginPremium()`, `loginEmail()` (password configurable), y `noConsoleErrors` fixture.
- `helpers/apiClient.ts`: cliente de API para tests directos (request fixture con header auth).

### Reglas
- Esperas explícitas (`toBeVisible`, `toHaveURL`, `waitForResponse`), nunca `waitForTimeout` como sincronización.
- Selectores semánticos (`getByRole`, `getByPlaceholder`, `getByText`).
- Capturar errores de consola y red; clasificar.

### Orden de ejecución (para iteraciones)
1. Corregir BUG-001, BUG-002, BUG-003 (bloquean flujos críticos).
2. Implementar suite.
3. Ejecutar; analizar fallos; corregir bugs reales.
4. Regresión completa.
5. Generar `QA_REPORT.md`.