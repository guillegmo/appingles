import { expect, type Page } from '@playwright/test';

export type DayExercise = {
  type: string;
  prompt: string;
  options?: string[];
  answer: number | string | number[];
  words?: string[];
  pairs?: { en: string; es: string }[];
};

// Resuelve el ejercicio ACTUAL en pantalla usando el contenido real del día
// (obtenido por API), en lugar de respuestas hardcodeadas. Así los tests no
// quedan obsoletos si se reordenan/añaden ejercicios: valida además que
// QuestionCard sabe renderizar cada tipo (mcq, gapfill, translate, order,
// listening, matching, dialogue, errorfix, listen-type, listen-order) y que el
// auto-avance (900 ms) funciona.
export async function solveExercise(page: Page, ex: DayExercise, index: number, total: number): Promise<void> {
  await expect(page.getByText(`${index} / ${total}`)).toBeVisible({ timeout: 10_000 });

  switch (ex.type) {
    case 'mcq':
    case 'gapfill':
    case 'dialogue':
    case 'errorfix':
      await page.getByRole('button', { name: (ex.options as string[])[ex.answer as number], exact: true }).click();
      break;
    case 'translate':
      await page.getByPlaceholder('Escribe tu respuesta en inglés…').fill(String(ex.answer));
      break;
    case 'listen-type':
      await page.getByRole('button', { name: 'Escuchar' }).click();
      await page.getByPlaceholder('Escribe lo que escuchas…').fill(String(ex.answer));
      break;
    case 'listening':
      await page.getByRole('button', { name: 'Escuchar' }).click();
      await page.getByRole('button', { name: (ex.options as string[])[ex.answer as number], exact: true }).click();
      break;
    case 'order': {
      const words = ex.words as string[];
      const answer = ex.answer as number[];
      for (const wi of answer) {
        await page.getByRole('button', { name: words[wi], exact: true }).click();
      }
      break;
    }
    case 'listen-order': {
      await page.getByRole('button', { name: 'Escuchar' }).click();
      const words = ex.words as string[];
      const answer = ex.answer as number[];
      for (const wi of answer) {
        await page.getByRole('button', { name: words[wi], exact: true }).click();
      }
      break;
    }
    case 'matching': {
      const combos = page.getByRole('combobox');
      for (let i = 0; i < (ex.pairs as unknown[]).length; i++) {
        await combos.nth(i).selectOption(String(i));
      }
      break;
    }
    default:
      throw new Error(`Tipo de ejercicio no soportado por el solver: ${ex.type}`);
  }

  await page.getByRole('button', { name: 'Comprobar respuesta' }).click();
  if (index < total) {
    await expect(page.getByText(`${index + 1} / ${total}`)).toBeVisible({ timeout: 10_000 });
  }
}

// Mock de Web Speech Recognition que emite las frases dadas en cada "start()",
// permitiendo superar el paso "Hablar" sin micrófono real y con las frases del
// día correspondiente (las de day-flow solo cubren el Día 1).
// Nota: inyéctalo con page.addInitScript ANTES de una navegación completa que
// monte DayViewPage, para que `speech.supported` se calcule en true al montar.
export function speechMockFor(phrases: string[]): string {
  return `
  (() => {
    let idx = 0;
    const phrases = ${JSON.stringify(phrases)};
    class MockSR {
      constructor() { this.lang = ''; this.interimResults = false; this.continuous = false; }
      start() {
        const text = phrases[idx % phrases.length]; idx++;
        setTimeout(() => {
          if (this.onresult) this.onresult({ results: [{ 0: { transcript: text }, isFinal: true }] });
          if (this.onend) this.onend();
        }, 120);
      }
      stop() { if (this.onend) this.onend(); }
    }
    window.SpeechRecognition = MockSR;
    window.webkitSpeechRecognition = MockSR;
  })();
  `;
}