# TECH_SPEC.md — AppIngles

## Arquitectura por capas

```
UI (app/) → API (Express) → Domain Services → Firestore → External (Groq, Firebase Auth, Hotmart)
```

IA y pagos desacoplados detrás de servicios propios.

## Estructura del repo

```
AppIngles/
├─ app/                      # React 19 + Vite + TS (patrón CalmaApp)
│  ├─ src/{components,context,hooks,pages,services,types,utils}
│  ├─ src/pages: Home, Practice, DayView, Tutor, Progress, Profile, Premium, Auth
│  └─ src/components: ui/, challenge/, speaking/, tutor/, premium/
├─ api/                      # Express + Firebase Admin
│  ├─ routes: auth, days, exercises, speaking, ai, subscription, analytics, content
│  ├─ services: entitlement, aiUsage, aiPrompt, payment, recommendation, scoring, streak
│  ├─ webhooks: hotmart.js
│  └─ server.js
├─ content/                  # JSON del curriculum (days/, post21/, challenges/)
└─ docs/
```

## Modelo de datos (colecciones Firestore)

`users` · `userProfiles` · `learningGoals` · `days` · `lessons` · `phrases` · `vocabulary` · `exercises` · `exerciseAttempts` · `dailyProgress` · `streaks` · `badges` · `learningPlans` · `recommendations` · `aiConversations` · `aiMessages` · `aiUsage` · `savedPhrases` · `subscriptions` · `payments` · `content` · `analyticsEvents` · `reviewCards` · `contentDrafts` · `speakingSessions` · `reviewResults` · `seasonClaims`

### Campos clave (repetición espaciada / contenido / suscripción)

```ts
// Phrase / Vocabulary
masteryLevel: 0-5
lastReviewed: Timestamp
nextReview: Timestamp
incorrectAttempts: number
correctAttempts: number

// Content
generated_content: boolean
source: 'original' | 'adapted' | 'provisional' | 'new'
status: 'draft' | 'review' | 'approved' | 'published' | 'archived'

// Subscription
trialStart: Timestamp
trialEnd: Timestamp
subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
plan: 'free' | 'premium'
entitlements: Record<string, boolean | number>
```

## Servicios de dominio (backend)

| Servicio | Responsabilidad |
|---|---|
| `EntitlementService` | `canAccessDay`, `canUseAI`, `canUseVoice`, `canUseRoleplay`, `canAccessSmartReview`, `canAccessAdvancedStats` — **única fuente de verdad** |
| `AIUsageService` | Registra `{userId, date, feature, tokens, estimatedCost}` + límites diarios/mensuales por plan |
| `AIPromptService` | Prompts versionados (`tutor-v1`, `conversation-v1`, `roleplay-v1`, `correction-v1`, `speaking-v1`, `interview-v1`, `travel-v1`, `grammar-v1`) |
| `PaymentService` | Capa abstracta; adapter Hotmart; webhooks → estados de suscripción idempotentes |
| `RecommendationEngine` | Perfil + nivel + debilidades + historial → misión diaria |
| `ScoringService` | XP, streak, badges (incl. streak-30), assessment scores, perfil |
| `SrsService` | SM-2: `schedule(quality, card)` → intervalos/ease, `dueCards`, `dueKey` (puro, testeado) |
| `ReviewService` | CRUD `reviewCards`; `ensureCard(userId, day)` crea tarjeta desde el vocabulario del día; `recordResult`, `countDue` |
| `ContentGenerator` | Genera lecciones vía IA (Groq o mock en dev), `parseJsonResponse` (limpia fenced JSON), `listDrafts`, `publishLesson` (draft→published) |
| `SeasonsService` | Ventana semanal (L-D), `evaluateSeason` computa progreso de retos sobre métricas con fecha, `totalReward` (puro, testeado) |

## API (endpoints principales)

- `POST /auth/verify` — Firebase token → sesión
- `GET /challenge/days` — lista del reto con estado del usuario
- `GET /challenge/day/:id` — contenido del día
- `POST /exercises/attempt` — evalúa ejercicio, da XP
- `POST /speaking/analyze` — transcribe + feedback (V5+; en V1 la voz es solo Web Speech)
- `POST /tutor/message` — Tutor IA (modo, contexto, historial), valida entitlement + usage
- `POST /tutor/stuck` — "I'm Stuck": explica el concepto que atascó
- `GET /tutor/history?mode=` — historial del modo (memoria contextual)
- `GET /tutor/usage` — mensajes IA usados hoy / límite del plan
- `GET /tutor/modes` — catálogo de los 8 modos + stuck
- `GET /progress` — progreso, streak, XP, badges
- `GET /report/weekly` — reporte semanal
- `GET /subscription/status` — estado de suscripción/entitlements
- `GET /subscription/checkout` — link de pago Hotmart (o dev: null)
- `POST /analytics/event` — registro de eventos de producto
- `GET /analytics/advanced` — analytics avanzados del usuario (Premium IA): precisión, pronunciación, uso de IA, vocabulario, perfil
- `GET /analytics/dashboard` — métricas de negocio (admin): MRR, churn, trial conversion, AI cost
- `POST /webhooks/hotmart` — webhook de pagos (firma HMAC + idempotencia)
- `GET /review/smart` — tarjetas por día (recomendadas)
- `GET /review/due` — tarjetas vencidas hoy (SRS), con `id` para enviar resultado
- `GET /review/count` — nº de tarjetas vencidas
- `POST /review/:id/result` — guarda calidad 0/3/4/5 y reprograma (SM-2)
- `POST /admin/content/generate` — genera borrador IA (`{skill, situation, topic}`) → draft
- `GET /admin/content/drafts?status=` — lista borradores (admin)
- `POST /admin/content/:id/publish` — publica borrador → lección visible en `/content/post21`
- `GET /seasons/current` — temporada activa + retos con progreso (post-21)
- `POST /seasons/claim` — reclama la recompensa XP de la temporada (una vez)
- `GET /privacy/data/export` — paquete JSON con todos los datos del usuario (GDPR)
- `DELETE /privacy/data` — elimina todos los datos del usuario ("derecho al olvido")

## Tutor IA (V3)

- **Contexto del prompt:** nivel, día/lección actual, objetivo, debilidades, errores recientes, vocabulario conocido.
- **8 modos:** Conversation, Roleplay, Correction, Pronunciation, Vocabulary, Grammar, Interview, Travel.
- **I'm Stuck:** hint / help me say it / example.
- **Feedback estructurado:** *You said → Better → Why → Try again*.
- **Memoria mínima y útil:** no guardar información innecesaria.
- **Voice-first:** Microphone → STT → AI → Feedback → TTS (Web Speech API en V1, reemplazable).

## Limitación de IA (entitlements)

```
Free:        3 mensajes IA de prueba
Premium:     allowance generoso (configurable en backend, p.ej. 60/día)
Premium Plus: allowance mayor (V5+, opcional)
```
Nunca "unlimited" si el coste real puede generar abuso.

## Seguridad (OWASP)

- Autenticación real (Firebase Auth) + autorización con claims y Firestore rules.
- Validación y sanitización de inputs en API.
- Rate limiting (express-rate-limit).
- CORS whitelist.
- Verificación de webhooks Hotmart (HMAC/firma) + idempotencia.
- Secretos en variables de entorno; API keys solo en backend.
- Protección XSS (React + sanitización de salidas IA).
- No guardar audios crudos por defecto; si se guardan, solo transcripción anónima.

## Privacidad (V6)

- Consentimiento al registro · eliminación de cuenta y datos · control de historial IA · política de retención de datos · protección de información personal.
- **Derechos GDPR en API:** `GET /api/privacy/data/export` (portabilidad: JSON con todas las colecciones del usuario) y `DELETE /api/privacy/data` (supresión). Implementados en `routes/privacy.js` con lista de colecciones por usuario; el `listDocs` de file-store devuelve `id` para filtrar correctamente.
- **UI:** `PrivacyPage` (descargar datos / eliminar con confirmación) enlazada desde Profile.

## PWA (V6)

- `app/public/manifest.webmanifest` + `app/public/sw.js` (caché de app shell: `/`, `index.html`, manifest, icono).
- Estrategia `network-first` para navegaciones con fallback al shell; API `/api*` se excluye (network-only).
- Registro del SW en `main.tsx` solo en producción (`import.meta.env.PROD`).
- Instalable (standalone) con icono SVG en `app/public/icons/icon.svg`.

## Testing

- **Unit:** XP, streak, entitlements, scoring, recommendation, webhook parser, SRS (SM-2), seasons (ventana semanal, evaluación de retos).
- **Integración:** auth, Firestore, AI service, suscripción.
- **E2E:** registro → onboarding → Día 1 → práctica → speaking → complete → Día 2 → … → Día 21 → assessment → plan → premium → AI tutor → temporadas → export/delete datos.

## Deuda técnica aceptada en V1

- Curriculum provisional (reemplazable sin tocar código).
- Firestore sin job de agregación (se añade en V2 con reportes).
- Premium Plus diferido.
- Voice solo en navegadores compatibles.
