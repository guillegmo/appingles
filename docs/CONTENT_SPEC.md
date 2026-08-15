# CONTENT_SPEC.md — AppIngles

## Taxonomía de contenido

| Clase | Definición | Campo |
|---|---|---|
| **ORIGINAL** | Texto proveniente del ebook | `source: "original"` |
| **ADAPTADO** | Contenido del ebook convertido en tarjetas, ejercicios, quizzes, audio, speaking, roleplays | `source: "adapted"` |
| **NUEVO** | Generado por IA o equipo para extender el producto | `generated_content: true` |
| **PROVISIONAL** | Curriculum actual, coherente con la metodología, reemplazable 1:1 cuando llegue el ebook | `generated_content: true` + `source: "provisional"` |

Todo contenido nuevo debe mantener coherencia con la metodología original y quedar en estado `draft` hasta revisión.

## Estructura de un Día

```
Learn → Listen → Pronounce → Practice → Speak → Challenge → Complete
```

Metadata obligatoria de cada día:
```json
{
  "id": "day-8",
  "day": 8,
  "title": "Directions",
  "topic": "directions",
  "goal": "Ask for and understand basic directions.",
  "estimatedTime": 15,
  "skill": "speaking",
  "grammarFocus": "imperatives",
  "vocabulary": [],
  "phrases": [],
  "xpReward": 40,
  "premium": false,
  "source": "provisional",
  "generated_content": true
}
```

## Los 21 días (curriculum provisional)

### Semana 1 · Fundamentos
| Día | Tema | Focus |
|---|---|---|
| 1 | Presentaciones | Greetings, name, nationality |
| 2 | Información personal | to be, números, edad |
| 3 | Gustos | like/don't like, food, hobbies |
| 4 | Rutinas | present simple, hora, daily activities |
| 5 | Preguntas | WH-questions |
| 6 | Speaking week 1 | Hablar 60s sobre ti |
| 7 | Repetición + mini-test | Review semana 1 |

### Semana 2 · Vida real
| Día | Tema | Focus |
|---|---|---|
| 8 | Direcciones | Imperatives, preposiciones de lugar |
| 9 | Compras | Precios, tallas, "Can I have..." |
| 10 | Restaurantes | Ordenar comida |
| 11 | Viajes | Aeropuerto, hotel |
| 12 | Pasado | was/were, verbos regulares, "yesterday" |
| 13 | Speaking week 2 | Roleplay en restaurante |
| 14 | Repetición + mini-test | Review semana 2 |

### Semana 3 · Comunicación
| Día | Tema | Focus |
|---|---|---|
| 15 | Futuro | going to / will |
| 16 | Trabajo | Jobs, workplace |
| 17 | Conversaciones | Small talk |
| 18 | Problemas | Pedir ayuda, "I need..." |
| 19 | Opiniones | I think / In my opinion |
| 20 | Speaking week 3 | Entrevista breve |
| 21 | Test final + Repetición | Transición → Assessment |

Cada día incluye: ~8–10 palabras de vocabulario, 5–6 frases clave con audio (TTS), 4–6 ejercicios (fill-in, matching, MCQ), 1 prompt de speaking y 1 reto real.

## Post-21 (V2)

### Assessment
6 bloques rápidos → scores 0–100:
`speakingScore · listeningScore · vocabularyScore · conversationScore · grammarScore · confidenceScore`

### English Profile
`level, strongestSkill, needsImprovement[], goal, recommendedPractice`

### Learning Plan 30 días
4 semanas basadas en debilidades. Ejemplo:
- Week 1: Speaking confidence
- Week 2: Listening
- Week 3: Real conversations
- Week 4: Travel English

### Daily Practice
Misión diaria de 15 min = 5' Vocabulary + 5' Listening + 5' Speaking + topic del día.

### Post-21 curriculum
Organizado por **skills** (Speaking, Listening, Vocabulary, Grammar, Pronunciation, Conversation), **situations** (Travel, Work, Social, Shopping, Restaurant, Airport, Hotel, Phone calls, Meetings, Interviews, Daily life) y **objectives**.

### Retos continuos (V5)
7-Day Speaking · 5-Day Travel · 7-Day Conversation · 14-Day Listening · 30-Day Confidence.

## Gestión de contenido

Pipeline de estados: `draft → review → approved → published → archived`.

Metadata obligatoria de lecciones: `{id, title, level, skill, topic, estimatedTime, difficulty, premium, contentType}`.

La generación IA produce **solo borradores** (`draft`) que requieren validación humana antes de publicarse.

## Estructura del Content Engine

```
content/
├─ 21-day-challenge/
├─ continuous-learning/
│  ├─ speaking/ listening/ vocabulary/ grammar/ travel/ work/ social/ interviews/
├─ post21/ (assessment, plans, daily-practice)
└─ challenges/
```
