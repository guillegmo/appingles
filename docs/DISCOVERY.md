# DISCOVERY.md — AppIngles

## Estado inicial

- **Proyecto:** `AppIngles` — carpeta vacía, greenfield.
- **Ebook:** no disponible en disco. Se usa **curriculum provisional** basado en la estructura temática del prompt (sección 3), marcado `generated_content: true` y reemplazable sin tocar código cuando se reciba el libro real.
- **Precedentes del usuario (a reutilizar):** CalmaApp (frontend React 19 + Vite 8 + TS + Tailwind v4 + Zustand + Router 7 + axios + lucide-react), calma-api (Express + Groq), boton-sos-backend (Firebase/Firestore).

## Stack decidido

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | React 19 + Vite + TS + Tailwind v4 + Zustand + Router 7 | Reusar patrón CalmaApp (consistencia, velocidad de desarrollo) |
| Backend | Node/Express (CommonJS) | Patrón calma-api, simple y desplegable |
| Auth | Firebase Auth (email + Google) | Gratis, escalable, reglas de seguridad |
| Datos | Firestore | Rápido para MVP, reglas por usuario |
| IA | Groq (llama-3.3-70b) | Coste bajo, ya usado por el usuario |
| Voz | Web Speech API (STT/TTS) | Coste cero; reemplazable por Whisper/Deepgram en V3 |
| Pagos | Hotmart | Elegido por el usuario; detrás de `PaymentService` abstracto |
| Deploy | Vercel (front) + Render/Railway (API) | Simplicidad |

## Riesgos y mitigaciones

- **Contenido provisional** → arquitectura de Content Engine con campo fuente `provisional/original`.
- **Firestore para analytics agregados** → eventos crudos en colección + agregación por job/CRON.
- **Voz en navegador** → fallback a texto para navegadores sin soporte.
- **Hotmart webhooks** → firma HMAC + verificación, estados idempotentes.

## Reglas innegociables

- El Día 21 es una transición, nunca el final de la experiencia.
- Entitlements validados en backend, nunca solo en frontend.
- Contenido IA siempre en `draft` hasta revisión humana.
- Sin dark patterns en monetización.
- API keys exclusivamente en backend.
- Testing por fase (unit + integración + E2E del recorrido completo).
