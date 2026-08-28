import { test, expect } from '@playwright/test';
import { newOnboardedUser } from '../helpers/testUser';
import { apiAuthed, tokenFromPage, sessionFromPage } from '../helpers/apiClient';
import { solveExercise, speechMockFor, type DayExercise } from '../helpers/solveExercise';

// Los días de repaso (7, 14, 21) tienen el mismo path con contenido distinto:
// 6 pasos (sin "practice"), reto = ExamCard con las N preguntas del review y su
// propia pronunciación. Un test por día usando el contenido real de cada uno.
for (const n of [7, 14, 21]) {
  test.describe(`Examen de repaso (Día ${n})`, () => {
    test('completa el mini-examen, aprueba y persiste', async ({ page, request }) => {
      await newOnboardedUser(page, `rsv${n}`);

      // Contenido real del día (fuente de verdad del flujo).
      const token = await tokenFromPage(page);
      const session = await sessionFromPage(page);
      const api = apiAuthed(request, '', token, session);
      const { res, body } = await api.get(`/challenge/day/${n}`);
      expect(res.status()).toBe(200);
      const day = body as {
        title: string;
        steps: string[];
        vocabulary: { es: string }[];
        phrases: { en: string }[];
        review: { title: string; passScore: number; questions: DayExercise[] };
      };
      const questions = day.review.questions;
      expect(questions.length).toBeGreaterThan(0);
      expect(day.vocabulary[0].es).toBeTruthy();

      // Mock de voz con las frases reales del día. Se registra ANTES de la
      // navegación completa a /day/:n (addInitScript corre al cargar ese
      // documento, cuando DayViewPage monta y calcula `speech.supported`).
      await page.addInitScript({ content: speechMockFor(day.phrases.slice(0, 3).map((p) => p.en)) });

      await page.goto(`/day/${n}`);
      await expect(page.getByRole('heading', { name: day.title })).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText(`Estación ${n} de 21`)).toBeVisible();

      // Aprender → Escuchar → Pronunciar → (Practicar solo si aplica).
      // exact: true porque el paso "Aprender" del Día 21 incluye otro botón cuyo
      // nombre accesible contiene "continuar" pero no coincide exactamente.
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await expect(page.getByRole('heading', { name: '👂 Escuchar' })).toBeVisible();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await expect(page.getByRole('heading', { name: '🗣 Pronunciar' })).toBeVisible();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();

      if (day.steps.includes('practice')) {
        // PracticeCard (quiz de vocabulario). Los días de repaso no lo incluyen.
        await expect(page.getByRole('heading', { name: '✏️ Practicar' })).toBeVisible();
        await page.getByRole('button', { name: day.vocabulary[0].es, exact: true }).click();
        await page.getByRole('button', { name: '¡Correcto! Continuar' }).click();
      }

      // Hablar (mock del día)
      await expect(page.getByRole('heading', { name: '🎤 Hablar' })).toBeVisible();
      for (let i = 1; i <= 3; i++) {
        await page.getByRole('button', { name: 'Pulsar para hablar' }).click();
        await expect(page.getByText('¡Muy bien!')).toHaveCount(i, { timeout: 10_000 });
      }
      await page.getByRole('button', { name: 'Completar práctica de habla' }).click();

      // Reto: ExamCard con las N preguntas del repaso (todas bien -> 100%).
      for (let i = 0; i < questions.length; i++) {
        await solveExercise(page, questions[i], i + 1, questions.length);
      }

      await expect(page.getByText('100%')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText(/¡Aprobado! Repaso bien hecho./)).toBeVisible();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();

      // Completado (el día 21 cierra el reto: su botón es "Ver mi próximo plan")
      await expect(page.getByRole('heading', { name: `¡Día ${n} completado!` })).toBeVisible();
      await page.getByRole('button', { name: n === 21 ? 'Ver mi próximo plan' : 'Continuar al siguiente día' }).click();
      await expect(page).toHaveURL(/\/home/);
      // Solo este día se completó (los demás siguen pendientes), así que el
      // contador global marca 1/21 y la estación actual vuelve al Día 1.
      await expect(page.getByText('1/21 días')).toBeVisible({ timeout: 30_000 });

      // Persistencia verificada por API
      const { res: progRes, body: progBody } = await api.get('/challenge/progress');
      expect(progRes.status()).toBe(200);
      expect(progBody.completedDays).toContain(n);
      expect(progBody.daysCompleted).toBe(1);
      expect(progBody.totalXp).toBeGreaterThan(0);
    });
  });
}