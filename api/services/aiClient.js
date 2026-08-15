// services/aiClient.js
// Cliente de IA (Groq). Usa fetch nativo (Node >= 20).
// Sin GROQ_API_KEY en modo dev devuelve una respuesta simulada (mock) para
// poder desarrollar/testear sin gastar tokens. En producción exige la key.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Precios estimados por millón de tokens (USD), por modelo. Ajustar en V4.
const PRICING = {
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
};
const PRICE = PRICING[GROQ_MODEL] || PRICING['llama-3.3-70b-versatile'];

function estimateCost(usage) {
  if (!usage) return 0;
  const input = (usage.prompt_tokens || 0) / 1_000_000 * PRICE.input;
  const output = (usage.completion_tokens || 0) / 1_000_000 * PRICE.output;
  return +(input + output).toFixed(6);
}

// Respuesta simulada para desarrollo sin API key.
// Si el system prompt pide JSON (generador de contenido), devuelve JSON válido.
function mockChat(messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const userText = lastUser?.content || '';
  const system = messages.find((m) => m.role === 'system')?.content || '';

  if (/genera una lección|EXACTAMENTE este JSON/i.test(system)) {
    const topicMatch = userText.match(/topic:\s*(.+)/i);
    const skillMatch = userText.match(/skill:\s*(\w+)/i);
    const situationMatch = userText.match(/situation:\s*(\w+)/i);
    const topic = (topicMatch?.[1] || 'Small talk').trim();
    const skill = (skillMatch?.[1] || 'conversation').trim();
    const situation = (situationMatch?.[1] || 'social').trim();
    const content = JSON.stringify({
      id: `gen-mock-${Date.now()}`,
      title: topic,
      level: 'beginner',
      skill,
      situation,
      topic,
      estimatedTime: 15,
      difficulty: 1,
      premium: true,
      contentType: 'lesson',
      goal: `Practice ${skill} around ${topic}.`,
      vocabulary: [
        { en: 'hello', es: 'hola' },
        { en: 'friend', es: 'amigo' },
        { en: 'today', es: 'hoy' },
        { en: 'nice', es: 'bonito' },
      ],
      phrases: [
        { en: 'Hello, how are you?', es: 'Hola, ¿cómo estás?' },
        { en: 'Nice to meet you.', es: 'Mucho gusto.' },
        { en: 'See you tomorrow.', es: 'Nos vemos mañana.' },
        { en: 'It is a nice day.', es: 'Es un día bonito.' },
      ],
      speak: `Say 4 sentences about ${topic}.`,
      challenge: `Have a short conversation about ${topic}.`,
      generated_by: 'ai',
      status: 'draft',
    });
    const usage = { prompt_tokens: 200, completion_tokens: 120, total_tokens: 320 };
    return { content, usage, mock: true };
  }

  const preview = userText.length > 80 ? `${userText.slice(0, 80)}…` : userText;
  const content =
    `[DEV MOCK · sin GROQ_API_KEY]\n` +
    `Great question! Let's practice.\n\n` +
    `You said: "${preview}"\n\n` +
    `Now try this: "What do you like to do on weekends?" — answer me out loud!`;
  const usage = { prompt_tokens: 40, completion_tokens: 30, total_tokens: 70 };
  return { content, usage, mock: true };
}

// Llama a Groq y devuelve { content, usage, model, mock }.
async function chat(messages, { temperature = 0.7, maxTokens = 400 } = {}) {
  if (!GROQ_API_KEY) return mockChat(messages);

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  return { content, usage: data.usage, model: data.model || GROQ_MODEL, mock: false };
}

module.exports = { chat, estimateCost, GROQ_MODEL, GROQ_API_KEY };
