# UX_SPEC.md — AppIngles

## Principio de diseño

"Entrenador personal", no PDF viewer ni LMS tradicional. **Mobile-first**, moderno, limpio, premium, rápido, accesible, responsive.

## Navegación principal

Bottom nav: **Home · Practice · AI Tutor · Progress · Profile**

Mismo esquema pre/post Día 21. El reto de 21 días pasa a ser **"My First Challenge"** dentro de Home/Practice.

## Flujo principal

```
Landing → Register → Onboarding (objetivo + nivel percibido) → Día 1
Día X: intro (goal, tiempo, progreso) → Learn → Listen → Pronounce → Practice → Speak → Challenge → Complete (+XP, streak, próximo día)
Día 21: 🎉 Completado → [SEE MY NEXT PLAN] → Assessment → English Profile → My English Plan (30 días) → Daily Practice
```

## Pantallas clave

### Home
- Saludo según hora del día.
- Streak 🔥 (8 DAY STREAK).
- Barra Day X / 21 con progreso.
- Today's mission (título + tiempo + CONTINUE).
- Recomendación IA.
- Paywall post-valor.

### Día (DayView)
- Intro: 🎯 Today's Goal, ⏱ tiempo, barra de progreso, START.
- Timeline de pasos: Learn → Listen → Pronounce → Practice → Speak → Challenge → Complete.
- Estado por paso, avance persistente.

### Speaking
- Botón micrófono grande, grabación.
- Transcripción en vivo.
- Feedback (You said → Better → Why → Try again).
- Reintento y completado.

### AI Tutor
- Selector de modos: Conversation, Roleplay, Correction, Pronunciation, Vocabulary, Grammar, Interview, Travel.
- Chat con mensajes.
- Botón 🎤 voz.
- **I'm Stuck**: hint / help me say it / example.
- Contador de mensajes del plan (límite Free/Premium).

### Progress
- Streak, XP, badges, días completados.
- Radar de skills.
- Reporte semanal.

### Premium / Paywall
- Aparece después de demostrar valor (Día 7 completado, 1ª conversación IA, debilidad detectada, Día 21).
- Transparente: qué incluye, precio, trial, cómo cancelar.
- Sin dark patterns.

## Estados críticos

| Estado | Comportamiento |
|---|---|
| Primer día | Onboarding suave, sin paywall |
| Día 21 | Transición → Assessment (nunca "fin") |
| Free con límite IA agotado | Sugerencia de Premium (no bloqueo brusco) |
| Premium expirado | Degradación suave a Free |
| Sin conexión | Contenido del día en caché (zustand persist + localStorage) |

## Accesibilidad

- Contraste AA, foco visible, textos grandes.
- Compatible con lectores de pantalla.
- Hit targets ≥ 44px.
- Modo reducir movimiento respetado.

## Criterios de evaluación UX (Fase 12)

- ¿Entiendo qué debo hacer? / ¿Sé cuánto me falta?
- ¿Quiero volver mañana? / ¿Percibo progreso?
- ¿Entiendo el valor Premium? / ¿El Tutor IA me ayuda?
- ¿El Día 21 me da una razón para continuar?
