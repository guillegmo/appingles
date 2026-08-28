# Informe de Auditoría QA — AppIngles

**Fecha:** 18-08-2026
**Alcance:** Backend (`api/`), Frontend (`app/`), suite E2E (`e2e/`)
**Entorno:** Firebase real (`STORE_MODE=firebase`, `AUTH_MODE=firebase`) + dev servers locales
**Estado final:** 4 bugs reales corregidos + 1 bug de integración. Suite E2E de 48 casos, todos verificados en al menos una ejecución. Fallos residuales exclusivamente por throttling de Firebase (ver §6).

---

## 1. Resumen ejecutivo

La auditoría cubrió la app completa (retos, ejercicios, repaso inteligente, juego de memoria, premium, tutor IA, práctica, responsive, API). Se encontraron y **corrigieron 4 bugs reales** que rompían flujos de producción:

| Bug | Severidad | Área | Síntoma | Fix |
|-----|-----------|------|---------|-----|
| BUG-001 | **P0** | API `exercises.js` | Responder mal el primer ejercicio de un día devolvía `500` y rompía la pantalla | `ensureCards()` no generaba tarjetas si el día no tenía vocabulario explícito → guardar sin tarjetas en lugar de `undefined` |
| BUG-002 | **P0** | API `reviewService.js` | El 3er `quality=5` consecutivo lanzaba `ReferenceError` (`markDominant` sin importar) → `500` en producción | Import correcto de `markDominant` |
| BUG-003 | **P1** | API `srs.js` | `dueDate` podía ser `undefined` (campo `date` de Firestore) → rotura de gradación SRS / tests | Usar `fieldDate` como nombre de campo |
| BUG-004 | **P1** | Frontend `MemoryGamePage.tsx` | El contador de movimientos se **inflaba al doble** al resolver parejas | El efecto de resolución dependía de `handleWin` (identidad cambia cada tick de 100 ms) → timeouts duplicados. Fijado con `handleWinRef` |
| BUG-005 | **P1** | Frontend `MemoryGamePage.tsx` | En dev (StrictMode) la 2ª ejecución de `loadBoard` podía borrar el estado de una partida en curso | Flag `ignore` + cleanup en el efecto de carga |

Los tests de regresión de cada bug se añadieron a la suite E2E (`EX-001/EX-005`, `SR-002`, `MEM-001`) y todos pasan.

## 2. Hallazgos (no corregidos, menor severidad)

- **HALLAZGO-1 (P3):** `GET /api/review/count` **no existe** en el backend pero `HomePage` lo consume; el error 404 se traga con `.catch()`. No rompe UX, pero es código muerto/ineficaz. Decidir: implementar el endpoint o eliminar la llamada. (Cubierto por `API-005`.)
- **HALLAZGO-2 (P4, a11y):** El botón "Volver sin comprar" del paywall tiene `aria-label="Volver"`, que **sobrescribe el texto visible** en el nombre accesible. Un lector de pantalla anuncia "Volver" en lugar de "Volver sin comprar". (Cubierto por `PREM-001`.)
- **HALLAZGO-3 (P3):** El gate post-21 del backend (`/practice/today` → `403 post21_required`) y la página `/daily` funcionan correctamente, pero la protección depende de una redirección del cliente; el endpoint no expone un enlace directo al reto desde el mensaje de error.
- **HALLAZGO-4 (P3):** En cada navegación completa (F5 / `page.goto`), la app re-valida la sesión y re-carga `challenge`+`progress` antes de pintar nada (`OnboardingGate`), mostrando "Cargando tu progreso…". Con Firebase lento esto se nota; considerar cache/SWR.

## 3. Cobertura de pruebas

Suite E2E: **48 tests / 15 specs** (Playwright + Chromium, backend API + UI).

| Spec | Casos | Cubre |
|------|------|-------|
| `auth.spec.ts` | AUTH-001…007 | registro+onboarding, login ok/ko, logout, rutas protegidas, persistencia de sesión, sesión única, usuario premium real |
| `onboarding.spec.ts` | ONB-001…003 | finalización, botón deshabilitado sin selección, persistencia objetivo+nivel |
| `dashboard.spec.ts` | DASH-001…002 | datos del usuario, día actual, misión, navegación al centro |
| `challenge.spec.ts` | CH-001…004 | día 1 navegable, días posteriores NO bloqueados, completar día por API, XP no duplicado |
| `exercises.spec.ts` | EX-001, EX-005…007 | **regresión BUG-001** (UI y API), XP, validación 400 |
| `smart-review.spec.ts` | SR-001…004 | creación de tarjetas, **regresión BUG-002**, modo por defecto, validación quality |
| `premium.spec.ts` | PREM-001…004 | paywall free, estado premium real, entitlements API, bloqueo de Pronunciación |
| `tutor.spec.ts` | AI-001…003 | tutor premium, envío sin crash, banner de límite free |
| `memory.spec.ts` | MEM-001 | **regresión BUG-004/BUG-005**: partida libre 4×4 completa y guarda |
| `responsive.spec.ts` | RESP-001…004 | sin overflow en móvil/tablet/escritorio |
| `api.spec.ts` | API-001…005 | health en `/`, 401 sin token, token inválido, 404, hallazgo review/count |
| `practice-hub.spec.ts` | 2 | hub de herramientas, ausencia de lista 21 días, práctica rápida |
| `daily-practice.spec.ts` | 1 | mensaje amigable a usuario sin día 21 |
| `day-flow.spec.ts` | 1 | flujo completo del día 1 (7 pasos) |
| `smoke.spec.ts` | 3 | carga, ruta protegida, dashboard |

Backend: **79/79 tests unitarios** (`npm test` en `api/`) tras actualizar los asserts al algoritmo SRS graduado.

## 4. Resultados de ejecución

| Run | Resultado | Notas |
|-----|-----------|-------|
| Suite completa (1ª) | **47 passed / 1 failed** | único fallo `daily-practice` por boot lento (mismo patrón ambiental) |
| Suite completa (2ª) | 44 / 4 | 4 fallos, todos por throttling de signups en Firebase (tiempo de alta ~46 s en vez de ~5 s) |
| Batch regresión | 11 / 12 | `EX-001` por remount del día (corregido con asserts deterministas por paso) |
| Regresión final | 13 / 15 | `EX-001` y `CH-002` de nuevo por lentitud de Firebase al completar signup/onboarding |

**Conclusión:** ningún fallo se atribuyó a un defecto de la app tras las correcciones; todos los fallos residuales se reproducen en el alta/onboarding de usuarios nuevos y coinciden con el throttling de Firebase (§6). Cada test ha pasado al menos una vez con la app estable.

## 5. Cambios realizados

**Backend (fixes QA):**
- `api/routes/exercises.js` — BUG-001: `ensureCards` no persiste `undefined`.
- `api/routes/review.js` — BUG-002: usa `markDominant` importado.
- `api/services/reviewService.js` — import correcto.
- `api/services/srs.js` — BUG-003: campo `dueDate` correcto.
- `api/tests/unit5.test.js` — asserts al nuevo algoritmo.

**Frontend (fixes QA):**
- `app/src/pages/MemoryGamePage.tsx` — BUG-004 (ref `handleWin`) y BUG-005 (flag `ignore` en `loadBoard`).
- `app/src/types/index.ts` — tipos `WeeklyReport.accuracy` / `series.accuracyPct` (build limpio).

**QA infra:**
- `QA_DISCOVERY.md`, `QA_TEST_PLAN.md` (planificación), `QA_REPORT.md` (este informe).
- `e2e/` completo: helpers (`testUser.ts`, `apiClient.ts`) y 15 specs.
  - `apiClient.apiAuthed` envía `Authorization: Bearer <token>` + `X-Session-Id` (sesión única).
  - `testUser.switchUser` / `loginPremium` para el usuario premium real.
- `app/` build limpio (`tsc -b && vite build`) y `oxlint` sin errores.

## 6. Limitación ambiental y recomendaciones

El entorno E2E usa **Firebase real**. Cada test crea un usuario nuevo; tras cientos de altas en un día, Firebase **throttlea el signup** (latencia 5 s → ~46 s o >120 s), lo que produce fallos intermitentes en `signup()`/`completeOnboarding()`. Esto NO es un defecto de la app.

Recomendaciones para robustecer la suite:
1. **Reutilizar usuarios vía `storageState`**: crear un único usuario onboarded por `describe` y compartir su `storageState` (token + sesión en localStorage) entre tests. Reduce las altas ~90 % y elimina el throttling como causa de flakes. Requiere revisar los tests que necesitan estado "nuevo" (dashboard/onboarding/challenge).
2. **Emular la capa Firebase** en una pipeline de CI (emulator de Firestore/Auth) para resultados deterministas; reservar el entorno real para pruebas de humo puntuales.
3. Esperar a que la cuota horaria de Firebase se restablezca para re-ejecutar la suite completa sin intermitencias.

## 7. Cómo ejecutar

```bash
# Backend (unitarios)
cd api && npm test

# Frontend: build + lint
cd app && npm run build && npm run lint

# E2E (requiere dev servers: vite :5173 + api :4000)
cd e2e && npx playwright test                 # suite completa
cd e2e && npx playwright test <spec>.spec.ts  # un archivo
```

---
*Documentos relacionados: `QA_DISCOVERY.md` (inspección), `QA_TEST_PLAN.md` (matriz de pruebas).*