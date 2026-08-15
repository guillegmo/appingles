# Inglés en 21 Días — App

Micro-app de aprendizaje de inglés (SaaS EdTech) construida a partir del método "Inglés en 21 Días".

**Reto de 21 días → Hábito → Evaluación → Plan personalizado → Aprendizaje continuo → Tutor IA → Premium.**

## Estructura

```
app/       # Frontend: React 19 + Vite + TypeScript + Tailwind v4 + Zustand + React Router
api/       # Backend: Node/Express + Firebase Admin + Firestore (o store local en dev)
content/   # Curriculum (JSON): 21 días + assessment + planes + daily practice
docs/      # Specs: DISCOVERY, PRODUCT_SPEC, CONTENT_SPEC, TECH_SPEC, UX_SPEC, ROADMAP
tools/     # Generador de contenido (re-ejecutable)
```

## Quick start

### 1. Backend (puerto 3001)

```bash
cd api
cp .env.example .env
npm install
npm start
```

> Modo dev: usa store local de archivos (`api/.data`) y auth por header `X-Dev-User`.
> Producción: `STORE_MODE=firebase` + `AUTH_MODE=firebase` con credenciales de Firebase.

### 2. Frontend (puerto 5173)

```bash
cd app
npm install
npm run dev
```

Abre `http://localhost:5173`, regístrate en modo demo y completa tu primer día.

### 3. Test del backend

```bash
cd api
npm test
```

## Roadmap de fases

- **V1 (hecho):** auth dev, onboarding, reto 21 días, ejercicios, speaking (Web Speech), XP, streak, badges, límites Free/Premium.
- **V2 (hecho):** assessment + English Profile + plan 30 días post-21, Daily Practice (15 min con recomendación por debilidad), curriculum continuo por skills/situaciones, reporte semanal, Smart Review.
- **V3 (hecho):** Tutor IA (Groq) con 8 modos + "I'm Stuck", prompts versionados, memoria contextual, límite diario de mensajes, voz (STT/TTS), coste por tokens.
- **V4 (hecho):** Hotmart vía PaymentService abstracto, webhook con firma + idempotencia, expiración de trial, analytics de producto + dashboard de negocio (MRR, churn, AI cost).
- **V5 (hecho):** repetición espaciada (SM-2), Smart Review avanzado, generación IA de contenido con flujo draft→published, admin de contenido, objetivo semanal.
- **V6 (hecho):** niveles en UI (Beginner→Intermediate), temporadas con retos semanales y recompensas en XP, privacidad/GDPR (export + eliminación de datos), PWA instalable con modo offline.

Ver `docs/ROADMAP.md` para detalle.
