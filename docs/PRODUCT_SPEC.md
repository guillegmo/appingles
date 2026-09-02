# PRODUCT_SPEC.md — AppIngles

## Visión

Transformar el ebook **"Inglés en 21 Días"** en un **entrenador personal de inglés con IA** que no termina en el Día 21: evalúa, crea un perfil, arma un plan de 30 días y genera práctica diaria + práctica conversacional con IA. El usuario pasa de *"quiero aprender inglés"* a *"esta aplicación es mi entrenador de inglés"*.

## Usuarios

- **Persona primaria:** hispanohablante adulto, nivel principiante, que "sabe vocabulario pero se queda en blanco al hablar". Compra ebooks digitales, baja tolerancia al abandono, móvil-first.
- **Secundaria:** quien viaja o trabaja en inglés y quiere retos específicos.

## Propuesta de valor

1. Método práctico: hablar desde el día 1 (diferenciador del ebook).
2. Hábito: 15 min/día, streak, misión diaria clara ("¿Qué hago hoy?").
3. Personalización: perfil → plan → recomendaciones → Tutor IA contextual.
4. Tutor IA que corrige y conversa sin vergüenza.
5. El Día 21 no es el final: es el inicio del plan continuo.

## Evolución del producto

```
EBOOK → RETO 21 DÍAS → HÁBITO → EVALUACIÓN → PLAN PERSONALIZADO → APRENDIZAJE CONTINUO → TUTOR IA → PRÁCTICA DIARIA → PREMIUM → SUSCRIPCIÓN
```

## Planes y monetización

| Plan | Incluye | Monetización |
|---|---|---|
| **Free** (permanente) | Reto de 21 días COMPLETO (sin caducidad), ejercicios, speaking, Daily Practice, post-21, Smart Review, temporadas, streaks, XP, badges, reportes, analytics básicos, 3 mensajes IA/día de muestra | Activación / retención / muestra de valor IA |
| **Premium** (pago único, desde V8) | Todo lo relacionado con IA: Tutor IA completo (8 modos + voz bilingüe + "I'm Stuck", 30 mensajes/día), lecciones IA on-demand, score de pronunciación IA, banco de vocabulario IA, analytics avanzados | Hotmart, pago único: **$9.99 — acceso de por vida**, sin renovación ni expiración |
| **Retención (gratis)** | Listening premium (audios nativos + quizzes), ligas/leaderboard semanal, streak freeze, certificado Día 21 + tarjetas compartibles | Mantienen el hábito y empujan hacia la IA |

**Modelo:** el reto de 21 días es la prueba del producto (gratis para siempre); la IA es el producto de pago único (de por vida). El paywall **informa los beneficios y funciones adicionales** que se desbloquean al comprar la IA (comparativa Free vs Premium), nunca vende "Premium" genérico.

**Principios de pago:** valor real y honesto de la IA, sin dark patterns, condiciones transparentes ("pago único, acceso de por vida", sin lenguaje de suscripción/renovación), paywalls después de demostrar valor (Día 7, tras las 3 primeras conversaciones IA y en el Día 21).

> Nota (V8): las suscripciones mensual/anual recurrentes de versiones anteriores
> se mantienen funcionando tal cual para quien ya las tenía activas (no se les
> quita nada), pero el paywall ya no las ofrece a compradores nuevos.

## Momentos de conversión

- Después de completar los primeros días → mostrar progreso.
- Después de agotar los **3 mensajes IA/día** de muestra → "Tu tutor IA te espera. Desbloquea conversaciones ilimitadas".
- Después de una conversación IA → mostrar valor.
- Después de detectar una debilidad → "Your personalized practice is ready".
- Día 21 → "You've built the foundation. Now let's build fluency" + plan personalizado + certificado + upgrade a IA.

## Paywall (copy de beneficios IA)

El paywall comunica **qué hace la IA por el usuario** y las funciones adicionales al suscribirse:
- Tutor IA que conversa contigo, corrige tus errores en el momento y te da feedback (8 modos + voz).
- Lecciones generadas por IA para el tema exacto que quieres practicar.
- Puntaje de pronunciación en cada ejercicio de speaking.
- Banco de vocabulario personal que se arma con tus errores y lo que el tutor te enseña.
- Comparativa clara: qué es gratis (21 días + práctica + racha) y qué desbloquea la suscripción (IA).

## Retención (mecanismos legítimos)

Daily Practice · Streak (+ streak freeze) · Recomendaciones personalizadas · Smart Review · Progreso · Nuevos escenarios · Conversaciones IA · Goals · Reportes semanales/mensuales · Retos continuos · Ligas/leaderboard · Listening · Certificado Día 21.

## Objetivos de negocio (KPIs)

| Métrica | Objetivo inicial |
|---|---|
| Activation (completa onboarding) | ≥ 70% |
| Day 1 completion | ≥ 60% |
| Day 7 retention | ≥ 40% |
| Day 21 completion | ≥ 20% |
| Trial → Premium | ≥ 15% |
| Monthly churn | < 8% |
| MRR / ARR | Seguimiento desde V4 |
| AI cost por usuario/mes | < $1.00 |

## Eventos de analytics (V4)

`user_registered` · `onboarding_completed` · `day_started` · `day_completed` · `exercise_completed` · `speaking_started` · `speaking_completed` · `ai_session_started` · `ai_session_completed` · `trial_started` · `paywall_viewed` · `checkout_started` · `subscription_started` · `subscription_canceled` · `subscription_renewed`

## KPIs de producto (no optimizar registros)

`ACTIVATION + RETENTION + DAY COMPLETION + SPEAKING PRACTICE + TRIAL CONVERSION + SUBSCRIPTION RETENTION`
