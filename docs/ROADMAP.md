# ROADMAP.md — AppIngles

## Fases y criterios de salida

| Fase | Entregables | Criterio de aceptación |
|---|---|---|
| **V1 (MVP)** | Scaffold app+api, Auth, Onboarding, 21 días (curriculum provisional), ejercicios, speaking básico, XP, streak, badges básicos, Home | Registro → Día 1 → Día 21 completo E2E sin fallos |
| **V2** | Assessment, English Profile, Plan 30 días, Daily Practice, post-21 curriculum, reporte semanal | Usuario completa Día 21 y recibe práctica diaria al día siguiente |
| **V3** | Tutor IA (8 modos + I'm Stuck + voz), prompts versionados, AIUsageService, memoria contextual | 1ª conversación IA con corrección natural; límites Free/Premium aplicados |
| **V4** | Hotmart (webhook firmado + idempotencia), trial con expiración, analytics de producto y negocio, PremiumPage con estados | Suscripción de trial expira y bloquea rol premium; eventos trackeados llegan al dashboard |
| **V5** | SRS (SM-2), Smart Review avanzado, generación IA de contenido (draft→published), admin de contenido, objetivo semanal | Fallo crea tarjeta → revisión resetea/espacia según calidad; lección IA publicada aparece en post-21 |
| **V6** | Niveles en UI, temporadas con retos semanales + claim XP, export/eliminación de datos (GDPR), PWA offline | Champion completa un reto semanal y reclama XP; usuario exporta y elimina sus datos; la app es instalable y funciona offline |

## Orden de trabajo (recomendado)

1. **Estructura + specs** (docs, app, api, content).
2. **Contenido provisional:** JSON de los 21 días + assessment + plan base (bloque más pesado, primero para no bloquear la UI).
3. **Backend V1:** auth, días, ejercicios, scoring/XP/streak, entitlements iniciales.
4. **Frontend V1:** onboarding, Home, flujo de día, speaking (Web Speech).
5. **Test E2E del reto** antes de tocar IA/pagos.
6. **V2 → V3 → V4 → V5**, cada una con su review.

## Detalle por fase

### V1 — MVP (reto + hábito) ✅
- Autenticación + onboarding + objetivo.
- Reto de 21 días completo (estructura provisional).
- Ejercicios interactivos (fill-in, matching, MCQ).
- Speaking básico (Web Speech API).
- Progreso, Streak, XP, badges iniciales.
- Home dashboard.

### V2 — Post-21 ✅
- Assessment final (6 skills).
- English Profile.
- Plan personalizado 30 días.
- Daily Practice (15 min/día) — `RecommendationEngine` elige la lección según la debilidad.
- Contenido continuo por skills/situaciones (`content/post21/curriculum.json`, 12 lecciones).
- Reporte semanal (`/api/report/weekly`).
- Smart Review básico (`/api/review/smart`).

### V3 — Tutor IA ✅
- 8 modos + I'm Stuck.
- Prompts versionados en backend (`services/prompts.js`).
- AIUsageService (límites diarios y coste por tokens).
- Memoria contextual (colección `conversations` por user+mode, ventana de 12).
- Voz (STT con Web Speech + TTS para las respuestas).
- Sin `GROQ_API_KEY` responde con mock en dev para no gastar tokens.

### V4 — Premium ✅
- Hotmart vía PaymentService abstracto (`services/payments/`).
- Webhook `POST /webhooks/hotmart`: firma HMAC + token, idempotencia por evento, sincronización al store.
- EntitlementService con expiración automática de trial y estados (trialing/active/past_due/canceled/expired).
- Trial configurable y endpoint de checkout.
- Paywalls post-valor (PremiumPage con estados reales + contador de días de trial).
- Analytics de producto (`/api/analytics/event`) + dashboard de negocio (`/api/analytics/dashboard`, admin): MRR, churn, trial conversion, coste IA.

### V5 — Escalado ✅
- **Repetición espaciada (SM-2):** `services/srs.js` (schedule con ease factor, intervalos, `dueCards`/`dueKey`) + colección `reviewCards`.
- **Smart Review avanzado:** un fallo en `POST /exercises/attempt` crea la tarjeta del día; `/api/review/smart|due|count|:id/result`; calidad 0/3/4/5 recalcula intervalos. Frontend `SmartReviewPage` (tarjetas flip + TTS).
- **Generación IA de contenido:** `services/contentGenerator.js` + prompts de generación; en dev sin key el mock devuelve JSON válido; flujo estricto draft→published.
- **Admin de contenido:** `/api/admin/content/generate|drafts|:id/publish` con `requireAdmin`; `AdminPage` en frontend.
- **Contenido continuo en vivo:** `/api/content/post21` fusiona curriculum + lecciones IA publicadas (13 lecciones tras publicar 1).
- **Objetivo semanal:** `weeklyGoal` en el reporte (`targetDays=5`).
- **Badge de racha:** `streak-30` en `scoring.js`.

### V6 — Retención y privacidad ✅
- **Niveles en UI:** Home + Progress muestran nivel actual y barra hacia el siguiente (Beginner → Elementary → Pre-Intermediate → Intermediate).
- **Temporadas y retos continuos:** `content/continuous/seasons.json` (retos semanales: práctica, ejercicios, speaking, smart review); `services/seasons.js` (puro, con ventana semanal L-D); `/api/seasons/current` + `/api/seasons/claim` (XP una vez por temporada); `SeasonsPage` para champions.
- **Privacidad / GDPR:** `/api/privacy/data/export` (paquete JSON con datos del usuario) y `DELETE /api/privacy/data` (derecho al olvido); `PrivacyPage` accesible desde Profile.
- **PWA offline:** `manifest.webmanifest` + `sw.js` (caché de app shell, network-first con fallback); icono SVG; instalable desde el navegador.

### V7 — Modelo Premium IA + Recurrencia Hotmart ✅ (en curso)
- **Nuevo modelo de negocio:** el reto de 21 días es **permanente y gratis** (sin trial, sin caducidad). Todo lo relacionado con IA es **premium con pago recurrente** (Hotmart mensual $15 o anual $99). La prueba del producto es el reto completo; el gancho de pago es la IA.
- **Entitlements re-definidos:** Free = reto 21 días + Daily Practice + post-21 + Smart Review + temporadas + streaks + reportes + analytics básicos + **3 mensajes IA/día** de muestra. Premium IA = Tutor IA completo (8 modos + voz bilingüe) + lecciones IA on-demand + score de pronunciación IA + banco de vocabulario IA + analytics avanzados.
- **Hotmart recurrente en producción:** checkout con `custom=userId`; resolución de usuario en webhook por `custom` o índice `email→userId`; `mapEventToSubscription` con estados reales (`data.subscription.status`/`data.purchase.status`); eventos plan_changed, reactivación y overdue; renovación → `subscription_renewed` + `nextBillingDate`; planes mensual/anual con MRR = precio/12; config real + sandbox.
- **Paywall de beneficios IA:** PremiumPage vende los beneficios concretos de la IA (comparativa Free vs Premium IA) y comunica las funciones adicionales al suscribirse.

### V8 — Premium pago único de por vida ✅
- **Cambio de modelo de negocio:** Premium deja de ser suscripción recurrente y pasa a ser **pago único de $9.99 con acceso de por vida** (`plan: premium-lifetime`), vía Hotmart. Sin fecha de expiración: un `status: active` se mantiene indefinidamente hasta un evento explícito de reembolso/chargeback. `PREMIUM_PLANS` incluye `premium-lifetime` junto a los legacy `premium-monthly`/`premium-annual`, que se conservan intactos solo para quien ya los tenía activos antes de V8 (el paywall ya no los vende).
- **Tutor IA:** límite diario de Premium baja de 60 a **30 mensajes/día** (`entitlement.js`); ventana de contexto de 12 a **8 mensajes**; respuestas acotadas a **~100 tokens de salida** (antes 400) reforzado con instrucción de brevedad (30-60 palabras) en el prompt — controla el costo por mensaje sin cambiar de modelo.
- **`hotmart.js`:** reconoce el nuevo producto de pago único por `HOTMART_PRODUCT_LIFETIME_ID` o por nombre (`lifetime`/`de por vida`/`vitalicio`) y lo mapea a `premium-lifetime`; nuevo `HOTMART_CHECKOUT_URL_LIFETIME`.
- **Analytics de negocio:** `businessDashboard` separa `lifetimeRevenue`/`subscriptionCounts.lifetimeBuyers` del `mrr` (el pago único NO cuenta como ingreso recurrente).
- **Sin cambios:** Firestore ya negaba todo acceso directo desde el cliente (`firestore.rules`), así que no hizo falta tocar seguridad; el flujo de compra externa del Reto de 21 días (`reto21`, cuenta + activación por email) queda exactamente igual, fuera del alcance de este cambio.
- **Features IA premium:** score de pronunciación por fonema, lecciones IA on-demand (usa `contentGenerator.js`), banco de vocabulario personal (de errores y del tutor), **analytics avanzados** (`/api/analytics/advanced` + `StatsPage`): precisión global y por día (7/30), promedio/mejor score de pronunciación + frases recientes, uso del tutor IA (sesiones/tokens, sin costo), vocabulario capturado, speaking, XP/racha/freezes y perfil de habilidades.
- **Features de retención (gratis):** listening premium (audios nativos + quizzes), ligas/leaderboard semanal, streak freeze, certificado Día 21 + tarjetas de progreso compartibles.

### V8 — Escalado (siguiente)
- Notificaciones push / recordatorios de racha (Web Push + FCM).
- Lecciones generadas por IA en producción (costo optimizado).
- Modo concurso/liga avanzado entre usuarios.
- Plan familiar o anual+.

## Reglas de implementación

- NO desarrollar todo simultáneamente: `SPEC → ARCHITECTURE → MVP → TEST → VALIDATE → EXPAND`.
- El Día 21 es el comienzo del viaje, no el producto completo.
- IA es una parte del producto, no todo el producto: `CONTENT + CURRICULUM + PRACTICE + PERSONALIZATION + AI + PROGRESS`.
- El producto siempre debe tener una siguiente acción (Daily Practice → Complete → Feedback → Progress → Recommendation → Next → Streak → Return Tomorrow).
