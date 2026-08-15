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
| **Free** | Onboarding, Días 1–7 del reto, ejercicios básicos, streak, XP, 3 mensajes IA de prueba | Activación / retención |
| **Premium** (core) | Reto completo, contenido post-21, Daily Practice, Tutor IA completo (8 modos + voz), roleplays, listening, Smart Review, progreso avanzado, reportes | Suscripción mensual/anual vía Hotmart, trial configurable (7 días), condiciones transparentes |
| **Premium Plus** | Descartado en MVP. Arquitectura lista para añadirlo como upgrade de AI allowance cuando haya valor real | Fase V5+ |

**Principios de pago:** valor recurrente real, sin dark patterns, condiciones transparentes, paywalls después de demostrar valor (≈Día 7 y tras primera conversación IA).

## Momentos de conversión

- Después de completar los primeros días → mostrar progreso.
- Después de una conversación IA → mostrar valor.
- Después de detectar una debilidad → "Your personalized practice is ready".
- Día 21 → "You've built the foundation. Now let's build fluency" + plan personalizado.

## Retención (mecanismos legítimos)

Daily Practice · Streak · Recomendaciones personalizadas · Smart Review · Progreso · Nuevos escenarios · Conversaciones IA · Goals · Reportes semanales/mensuales · Retos continuos.

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
