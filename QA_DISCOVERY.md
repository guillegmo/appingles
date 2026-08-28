# QA DISCOVERY — AppIngles

Auditoría de calidad automatizada. Documento generado antes de crear la suite de pruebas.

## Stack

| Capa       | Tecnología |
| ---------- | ---------- |
| Framework  | Express 5 (backend) / React 19 (frontend) |
| Runtime    | Node >= 20 |
| Package mgr | npm (api, app, e2e) |
| Frontend   | React 19 + Vite 8 + TypeScript 6 + Tailwind v4 + Zustand 5 + React Router 7 + axios + lucide-react |
| Backend    | Node/Express 5 + express-rate-limit + cors + dotenv |
| Database   | Firestore (Firebase Admin). Fallback dev: store de archivos JSON en `api/.data` |
| Auth       | Firebase Auth (`AUTH_MODE=firebase`). Dev: header `X-Dev-User` |
| APIs       | REST bajo `/api/*` (proxy Vite 5173 → 3001) |
| IA         | Groq (`openai/gpt-oss-20b`) — Tutor IA |
| Pagos      | Hotmart (webhook con firma + idempotencia). No configurado en `.env` actual |
| Testing    | Playwright Test `@playwright/test` ^1.57 (e2e) + `node --test` (api unit) |

## Configuración de entorno detectada

- `app/.env`: `VITE_AUTH_MODE=firebase` — el frontend usa **Firebase Auth real**.
- `api/.env`: `STORE_MODE=firebase`, `AUTH_MODE=firebase` — el backend apunta al **proyecto Firebase real `appingles-app`** con Service Account local.
- Existe `GROQ_API_KEY` real en `api/.env`.
- `HOTMART_WEBHOOK_SECRET` vacío → pagos/webhooks no probables contra proveedor real.
- ⚠️ **RIESGO**: el entorno está conectado a un proyecto Firebase real. **NO** ejecutar pruebas destructivas (no borrar usuarios, datos, suscripciones). Usar usuarios de prueba nuevos (signup) y el usuario premium proporcionado (`guillegmo@hotmail.com`) para vistas Premium.

## Aplicación

### Rutas (frontend, `app/src/App.tsx`)

| Ruta | Pantalla | Auth requerida |
| ---- | -------- | -------------- |
| `/login` | Login / Registro | No |
| `/onboarding` | Onboarding | Sí |
| `/premium` | Premium IA (paywall) | Sí |
| `/home` | Dashboard / Ruta 21 días | Sí + Onboarding |
| `/practice` | Centro de práctica | Sí |
| `/practice/quick` | Práctica rápida | Sí |
| `/practice/memory/menu` | Menú Memory Match | Sí |
| `/practice/memory` | Juego Memory Match | Sí |
| `/practice/post21` | Aprendizaje continuo (post-21) | Sí |
| `/practice/:id` | Lección post-21 | Sí |
| `/daily` | Daily Practice (post-21) | Sí |
| `/day/:day` | Vista de día (reto 21) | Sí |
| `/tutor` | Tutor IA | Sí |
| `/progress` | Progreso | Sí |
| `/profile` | Perfil | Sí |
| `/privacy` | Privacidad/GDPR | Sí |
| `/review` | Smart Review (repaso inteligente) | Sí |
| `/seasons` | Temporadas | Sí |
| `/vocabulary` | Vocabulario | Sí |
| `/leaderboard` | Ligas | Sí |
| `/listening` | Listening | Sí |
| `/certificate` | Certificado | Sí |
| `/stats` | Estadísticas | Sí |
| `/admin` | Admin | Sí |

### APIs backend (`api/routes/*`)

- `/api/auth` — login/signup/session (dev: X-Dev-User)
- `/api/challenge` — índice, onboarding, día, completar día, assessment, progress
- `/api/exercises` — attempt, speaking, pronunciation
- `/api/subscription` — status, checkout, plans, cancel, activate (dev)
- `/api/practice` — today, complete (post-21)
- `/api/content` — post21, post21/:id, generate
- `/api/report` — weekly
- `/api/review` — smart, due, difficult, pool, :id/result
- `/api/seasons` — current, claim
- `/api/privacy` — export, delete data
- `/api/vocabulary` — items, list
- `/api/leaderboard` — ranking
- `/api/tutor` — modes, history, message, stuck, usage
- `/api/analytics` — event, advanced
- `/api/memory` — board, result, stats
- `/api/admin` — content generate/drafts/publish
- `/webhooks` — Hotmart

### Funcionalidades (clasificación)

| Funcionalidad | Estado |
| ------------- | ------ |
| Login / Registro (Firebase) | Implemented |
| Onboarding (objetivo + nivel) | Implemented |
| Dashboard con ruta 21 días | Implemented |
| Reto 21 días (7 pasos/día) | Implemented |
| Reglas de desbloqueo de días | Implemented (backend `locked`) |
| Ejercicios (mcq, gapfill, translate, order) | Implemented |
| Speaking (Web Speech) | Implemented |
| Reto diario / challenge | Implemented |
| Progress + persistencia | Implemented |
| XP / Streak / Badges / Temporadas / Ligas | Implemented |
| Día 21 → Assessment → Plan → post-21 | Implemented |
| Daily Practice (post-21) | Implemented |
| Tutor IA (Groq) + 8 modos + "I'm Stuck" | Implemented |
| Roleplay | Implemented (tutor, entitlement `canUseRoleplay`) |
| Premium / Entitlements | Implemented |
| Suscripción Hotmart (webhook) | Implemented (sin config real en env) |
| Perfil / Logout | Implemented |
| Smart Review (SRS) | Implemented |
| Memory Match | Implemented |
| Vocabulario, Listening, Estadísticas, Certificado, Privacidad, Admin | Implemented |

## Bugs detectados en Discovery (pre-tests)

| ID | Severidad | Área | Descripción | Evidencia |
| -- | --------- | ---- | ----------- | --------- |
| BUG-001 | **P0 CRITICAL** | exercises API | `POST /api/exercises/attempt` devuelve **500** cuando `correct=false`: llama `reviewService.ensureCard()` pero el servicio solo exporta `ensureCards` → `TypeError: reviewService.ensureCard is not a function`. | `api/routes/exercises.js:51` vs `api/services/reviewService.js:190` |
| BUG-002 | **P1 HIGH** | review API | `recordResult()` referencia `markDominant` sin importarlo → `ReferenceError` cuando una tarjeta alcanza 3 quality-5 → 500 en `POST /review/:id/result`. | `api/services/reviewService.js:151` |
| BUG-003 | **P3 MEDIUM** | SRS | `markDominant()` calcula `dueDate` de forma incorrecta (`getDate()+30` interpretado como timestamp). | `api/services/srs.js:112` |
| BUG-004 | **P4 LOW** | build | Errores TS pre-existentes: `ProgressPage.tsx(124)` `accuracy` y `types/index.ts(368)` `accuracyPct`. | `npm run build` |

## Riesgos

- **CRÍTICO**: respuesta de una API rota al fallar ejercicios (BUG-001) afecta el flujo central de aprendizaje.
- Entorno conectado a Firebase real: cuidado con datos.
- Tutor IA depende de Groq (límites, latencia, errores 429/500): la UI debe manejarlos.
- Speaking depende del navegador (Web Speech): en CI/headless debe mockearse.
- Los tests E2E actuales crean usuarios reales vía signup (no destructivo).

## Estado de la suite E2E existente

- `smoke.spec.ts` — 3 tests básicos (ok).
- `auth.spec.ts` — 3 tests (ok).
- `day-flow.spec.ts` — flujo completo Día 1 (responde todas correctas; NO dispara BUG-001).
- `practice-hub.spec.ts` — 2 tests.
- `daily-practice.spec.ts` — 1 test (gating post-21).
- `memory-game.spec.ts` — 1 test (fallaba previamente).
- `debug-login.spec.ts`, `debug-memory.spec.ts`, `minimal-test.spec.ts` — archivos de debug (a eliminar).