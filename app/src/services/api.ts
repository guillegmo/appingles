import axios from 'axios';
import { setKicked } from './sessionGuard';
import { authLog } from './authLog';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 120000,
});

// ---------------------------------------------------------------------------
// Timeout + reintentos controlados para las llamadas CRÍTICAS del bootstrap
// (login -> registerSession -> challenge/progress/subscription). Evita que una
// petición quede Pending para siempre y deje el loading bloqueado.
// - timeoutMs: si el backend no responde, se aborta con AbortController.
// - attempts:  reintentos SOLO ante fallos transitorios (red, 5xx, timeout).
//              Los 401/403/400 NO se reintentan (no tiene sentido).
// - Se registra endpoint, intento, duración y tipo de error (sin datos sensibles).
// ---------------------------------------------------------------------------
const BOOTSTRAP_TIMEOUT_MS = 15_000;

function isTransientError(e: unknown): boolean {
  if (axios.isAxiosError(e)) {
    if (!e.response) return true; // red caída / DNS / timeout / abort
    const s = e.response.status;
    return s >= 500 || s === 408 || s === 429;
  }
  return false;
}

function safeError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (e.code === 'ERR_CANCELED') return 'canceled';
    if (!e.response) return e.code || 'network';
    return String(e.response.status);
  }
  return e instanceof Error ? e.message.slice(0, 120) : 'unknown';
}

async function fetchWithRetry<T>(
  doRequest: (signal: AbortSignal) => Promise<T>,
  opts: { endpoint: string; attempts?: number; timeoutMs?: number; baseDelayMs?: number },
): Promise<T> {
  const attempts = opts.attempts ?? 2;
  const timeoutMs = opts.timeoutMs ?? BOOTSTRAP_TIMEOUT_MS;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  let last: unknown;

  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    authLog('API_REQUEST', { endpoint: opts.endpoint, attempt: i + 1 });
    try {
      const result = await doRequest(controller.signal);
      authLog('API_RESPONSE', { endpoint: opts.endpoint, ms: Date.now() - started });
      return result;
    } catch (e) {
      last = e;
      const aborted = controller.signal.aborted;
      authLog(aborted ? 'API_TIMEOUT' : 'AUTH_ERROR', {
        endpoint: opts.endpoint,
        attempt: i + 1,
        ms: Date.now() - started,
        error: safeError(e),
      });
      if (i < attempts - 1 && (aborted || isTransientError(e))) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
        continue;
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  throw last;
}

// Auth: en producción se envía el token de Firebase. En modo dev se usa X-Dev-User.
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'dev';

// Sesión única por pestaña: credenciales y sessionId en sessionStorage (aislado
// por pestaña). Así, iniciar sesión en otra pestaña crea un sessionId distinto y
// el backend expulsa la pestaña anterior (SESSION_EXPIRED).
function storage(): Storage {
  return window.sessionStorage;
}

// ---------------------------------------------------------------------------
// Caché en memoria de GETs + deduplicación de peticiones en vuelo.
// - ttlCache: respuesta válida durante ttlMs (memoria, muere con la pestaña).
// - inFlight: si dos callers piden el mismo recurso a la vez, comparten UNA
//   sola petición y ambos reciben la misma respuesta.
// NO se cachean tokens ni credenciales; solo datos de la API.
// ---------------------------------------------------------------------------
const ttlCache = new Map<string, { ts: number; value: unknown }>();
const inFlight = new Map<string, { promise: Promise<unknown>; signal?: AbortSignal }>();

function cacheKey(url: string, params?: unknown): string {
  return `${url}${params ? '?' + JSON.stringify(params) : ''}`;
}

async function cachedGet<T>(url: string, params?: Record<string, unknown>, ttlMs = 0, signal?: AbortSignal): Promise<T> {
  const key = cacheKey(url, params);
  const hit = ttlCache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.value as T;
  // Dedup: comparte la petición en vuelo SOLO si no fue abortada. En StrictMode
  // (dev) el primer efecto aborta su request en el cleanup y el segundo efecto
  // llega antes de que el mapa se limpie: sin este chequeo se uniría a una
  // petición ya cancelada y se quedaría sin datos.
  const pending = inFlight.get(key);
  if (pending && !pending.signal?.aborted) return pending.promise as Promise<T>;

  const entry: { promise: Promise<unknown>; signal?: AbortSignal } = { signal, promise: undefined as unknown as Promise<unknown> };
  const p = api
    .get<T>(url, { params, signal })
    .then((r) => {
      if (ttlMs > 0) ttlCache.set(key, { ts: Date.now(), value: r.data });
      return r.data;
    })
    .finally(() => {
      if (inFlight.get(key) === entry) inFlight.delete(key);
    });
  entry.promise = p;
  inFlight.set(key, entry);
  return p;
}

// Invalida entradas de caché cuya clave contenga `match`.
export function invalidateCache(match = '') {
  if (!match) {
    ttlCache.clear();
    return;
  }
  for (const key of ttlCache.keys()) {
    if (key.includes(match)) ttlCache.delete(key);
  }
}

// Todo lo que depende de XP/intentos/reportes queda obsoleto tras ganar XP.
function invalidateXpDependents() {
  invalidateCache('/analytics');
  invalidateCache('/report');
  invalidateCache('/seasons');
  invalidateCache('/leaderboard');
  invalidateCache('/challenge/progress');
}

// Al cambiar de usuario (login/logout) se limpia TODO el caché: nunca servir
// datos de un usuario a otro en la misma pestaña.
export function clearApiCache() {
  ttlCache.clear();
}

// Session única: un sessionId persistente por pestaña.
export function getSessionId(): string {
  let sid = storage().getItem('appingles_session');
  if (!sid) {
    sid = (crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    storage().setItem('appingles_session', sid);
  }
  return sid;
}

// Registra la sesión en el backend. Se deduplica por dispositivo y ventana corta
// para evitar llamadas redundantes (StrictMode en dev + LoginPage + onAuthStateChanged
// disparan varias veces la misma operación en ráfaga).
let lastRegisteredSessionId: string | null = null;
let lastRegisteredAt = 0;

export async function registerSession(): Promise<{ ok: boolean; replaced: boolean }> {
  const sessionId = getSessionId();
  const now = Date.now();
  if (sessionId === lastRegisteredSessionId && now - lastRegisteredAt < 2000) {
    return { ok: true, replaced: false };
  }
  const data = await fetchWithRetry(
    (signal) => api.post('/auth/session', { sessionId }, { signal }).then((r) => r.data),
    { endpoint: '/auth/session' },
  );
  lastRegisteredSessionId = sessionId;
  lastRegisteredAt = now;
  return data;
}

// Cierra la sesión en el backend al hacer logout explícito.
export async function clearSession(): Promise<{ ok: boolean }> {
  const { data } = await api.delete('/auth/session', { data: { sessionId: getSessionId() } });
  return data;
}

// Solo lectura: consulta si la sesión activa sigue siendo la de este dispositivo.
// NUNCA se cachea: la integridad de la sesión única depende de leerla fresco.
export async function validateSession(): Promise<{ activeSessionId: string | null }> {
  return fetchWithRetry(
    (signal) => api.get('/auth/session', { signal }).then((r) => r.data),
    { endpoint: '/auth/session' },
  );
}

api.interceptors.request.use((config) => {
  const token = storage().getItem('appingles_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (AUTH_MODE === 'dev') {
    const userId = storage().getItem('appingles_user');
    if (userId) config.headers['X-Dev-User'] = userId;
  }
  const sessionId = storage().getItem('appingles_session');
  if (sessionId) config.headers['X-Session-Id'] = sessionId;
  return config;
});

// Respuestas:
// - SESSION_EXPIRED: otra sesión tomó el control -> cierre local + aviso al router.
// - 401 (token de Firebase caducado ~1h o inválido): se refresca el token UNA vez
//   (getIdToken(true)) y se reintenta la petición. Evita bucles con la marca
//   __retried; si el refresco falla, se propaga el 401 original.
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.data?.code === 'SESSION_EXPIRED') {
      storage().removeItem('appingles_user');
      storage().removeItem('appingles_token');
      setKicked(true);
      window.dispatchEvent(new CustomEvent('session-expired'));
      return Promise.reject(err);
    }

    const status = err.response?.status;
    const config = err.config;
    const retried = (config as { __retried?: boolean } | undefined)?.__retried;
    if (status === 401 && config && !retried && storage().getItem('appingles_user')) {
      (config as { __retried?: boolean }).__retried = true;
      try {
        const { getToken } = await import('./firebase');
        const token = await getToken(true);
        if (token) {
          storage().setItem('appingles_token', token);
          return api(config);
        }
      } catch {
        // No se pudo refrescar (red caída, usuario eliminado, etc.): se propaga el 401.
      }
    }
    return Promise.reject(err);
  },
);

// ---------------------------------------------------------------------------
// TTLs por recurso (según cuán dinámico es el dato).
// ---------------------------------------------------------------------------
const TTL = {  day: 10 * 60_000, // contenido de un día: estático salvo la bandera completed
  challenge: 30_000, // índice del reto + entitlements
  progress: 30_000,
  subscription: 15_000,
  plans: 30 * 60_000, // catálogo de precios: semiestático
  assessment: 30 * 60_000, // configuración de evaluación: estática
  report: 30_000,
  review: 20_000,
  tutorModes: 30 * 60_000, // catálogo de modos: estático
  tutorHistory: 15_000,
  tutorUsage: 10_000,
  vocabulary: 20_000,
  leaderboard: 60_000,
  seasons: 30_000,
  stats: 30_000,
  memoryStats: 15_000,
  memoryBoardDaily: 5 * 60_000, // tablero diario: determinista por día
  content: 5 * 60_000, // índice de lecciones post-21
  lesson: 10 * 60_000, // detalle de lección: estático
  practice: 30_000,
} as const;

// API functions

export async function getChallenge(): Promise<import('../types').ChallengeIndex> {
  return fetchWithRetry(
    (signal) => api.get('/challenge', { signal }).then((r) => r.data),
    { endpoint: '/challenge' },
  );
}

export async function submitOnboarding(payload: { goal: string; level: number }): Promise<{ ok: boolean }> {
  const { data } = await api.post('/challenge/onboarding', payload);
  invalidateCache('/challenge');
  return data;
}

export async function getDay(day: number, signal?: AbortSignal): Promise<import('../types').DayContent> {
  return cachedGet(`/challenge/day/${day}`, undefined, TTL.day, signal);
}

export async function completeDay(day: number) {
  const { data } = await api.post(`/challenge/day/${day}/complete`);
  invalidateCache('/challenge');
  invalidateCache('/practice');
  invalidateXpDependents();
  return data;
}

export async function submitExercise(payload: { day: number; exerciseId: string; type: string; answer: string; correct: boolean }) {
  const { data } = await api.post('/exercises/attempt', payload);
  invalidateCache('/review');
  invalidateXpDependents();
  return data;
}

export async function recordSpeaking(day: number) {
  const { data } = await api.post('/exercises/speaking', { day });
  invalidateXpDependents();
  return data;
}

export async function scorePronunciation(payload: { transcript: string; target: string; day?: number }) {
  const { data } = await api.post('/exercises/pronunciation', payload);
  invalidateCache('/analytics');
  return data;
}

export async function getProgress(signal?: AbortSignal): Promise<import('../types').ProgressResponse> {
  // Si el caller gestiona su propia cancelación (p.ej. unmount de página),
  // se respeta ese signal sin reintentos. El bootstrap (sin signal) usa
  // timeout + reintento para no quedarse colgado.
  if (signal) return cachedGet('/challenge/progress', undefined, TTL.progress, signal);
  return fetchWithRetry(
    (s) => cachedGet('/challenge/progress', undefined, TTL.progress, s),
    { endpoint: '/challenge/progress' },
  );
}

export async function getAssessment(): Promise<import('../types').Assessment> {
  return cachedGet('/challenge/assessment', undefined, TTL.assessment);
}

export async function completeAssessment(scores: Record<string, number>): Promise<import('../types').AssessmentResult> {
  const { data } = await api.post('/challenge/assessment/complete', { scores });
  invalidateCache('/challenge');
  invalidateCache('/report');
  return data;
}

export async function getSubscriptionStatus(): Promise<import('../types').SubscriptionStatus> {
  return fetchWithRetry(
    (s) => cachedGet('/subscription/status', undefined, TTL.subscription, s),
    { endpoint: '/subscription/status' },
  );
}

export async function getCheckout(): Promise<{ url: string | null; dev: boolean; plan?: string }> {
  const { data } = await api.get('/subscription/checkout');
  return data;
}

export async function getCheckoutForPlan(plan: 'monthly' | 'annual'): Promise<{ url: string | null; dev: boolean; plan?: string }> {
  const { data } = await api.get('/subscription/checkout', { params: { plan } });
  return data;
}

export async function getPlans(): Promise<{ plans: import('../types').PlanOption[] }> {
  return cachedGet('/subscription/plans', undefined, TTL.plans);
}

export async function cancelSubscription(): Promise<{ subscription: import('../types').SubscriptionStatus['subscription']; entitlements: import('../types').Entitlements }> {
  const { data } = await api.post('/subscription/cancel');
  invalidateCache('/subscription');
  invalidateCache('/challenge');
  return data;
}

export async function activatePremiumDev(plan = 'premium', trialDays = 7) {
  const { data } = await api.post('/subscription/activate', { plan, trialDays });
  invalidateCache('/subscription');
  invalidateCache('/challenge');
  return data;
}

export async function trackAnalyticsEvent(event: string, meta: Record<string, unknown> = {}) {
  const { data } = await api.post('/analytics/event', { event, meta });
  return data;
}

// ---------- Acceso al producto (compra Hotmart → activación) ----------

export type AccessStatus = { hasAccess: boolean; plan: string; status: string };

export async function getAccessStatus(): Promise<AccessStatus> {
  const { data } = await api.get('/access/status');
  return data;
}

// Avisa al backend de que la cuenta acaba de activarse (perfil + analítica).
// No bloquea el flujo si falla.
export async function notifyActivated(): Promise<void> {
  await api.post('/access/activated').catch(() => {});
}

// Reenvío público del enlace de activación. La respuesta es siempre genérica
// para no revelar si el email tiene una compra asociada.
export async function resendActivation(email: string): Promise<{ ok: boolean; message?: string }> {
  const { data } = await api.post('/access/resend-activation', { email });
  return data;
}

export async function getDailyPracticeToday(signal?: AbortSignal): Promise<import('../types').DailyPracticeToday> {
  return cachedGet('/practice/today', undefined, TTL.practice, signal);
}

export async function completeDailyPractice(topic: string) {
  const { data } = await api.post('/practice/complete', { topic });
  invalidateCache('/practice');
  invalidateXpDependents();
  return data;
}

export async function getPost21(skill?: string, situation?: string, signal?: AbortSignal): Promise<import('../types').Post21Index> {
  return cachedGet('/content/post21', { skill, situation }, TTL.content, signal);
}

export async function getPost21Lesson(id: string, signal?: AbortSignal): Promise<import('../types').Post21LessonDetail> {
  return cachedGet(`/content/post21/${id}`, undefined, TTL.lesson, signal);
}

export async function getWeeklyReport(signal?: AbortSignal): Promise<import('../types').WeeklyReport> {
  return cachedGet('/report/weekly', undefined, TTL.report, signal);
}

export async function getSmartReview(): Promise<import('../types').SmartReview> {
  return cachedGet('/review/smart', undefined, TTL.review);
}

export async function getDueCards(limit = 20, signal?: AbortSignal): Promise<{ items: import('../types').ReviewCard[]; total: number }> {
  return cachedGet('/review/due', { limit }, TTL.review, signal);
}

export async function getReviewCount(): Promise<{ due: number }> {
  const data = await cachedGet<{ count?: number; due?: number }>('/review/count', undefined, TTL.review);
  return { due: data.count ?? data.due ?? 0 };
}

export async function submitReviewResult(cardId: string, quality: number): Promise<import('../types').ReviewResult> {
  const { data } = await api.post(`/review/${cardId}/result`, { quality });
  invalidateCache('/review');
  invalidateXpDependents();
  return data;
}

// Nuevos endpoints para el rediseño del repaso inteligente
export async function getDifficultCards(limit = 15, signal?: AbortSignal): Promise<{ items: import('../types').ReviewCard[]; total: number }> {
  return cachedGet('/review/difficult', { limit }, TTL.review, signal);
}

export async function getPoolCards(limit = 20, signal?: AbortSignal): Promise<{ items: import('../types').ReviewCard[]; total: number }> {
  return cachedGet('/review/pool', { limit }, TTL.review, signal);
}

export async function generateContentDraft(payload: { skill: string; situation: string; topic: string }): Promise<{ id: string; lesson: import('../types').AdminDraftSummary }> {
  const { data } = await api.post('/admin/content/generate', payload);
  return data;
}

export async function listContentDrafts(status?: string): Promise<{ items: import('../types').AdminDraftSummary[]; total: number }> {
  const { data } = await api.get('/admin/content/drafts', { params: { status } });
  return data;
}

export async function publishContentDraft(id: string): Promise<{ ok: boolean; lesson: import('../types').AdminDraftSummary }> {
  const { data } = await api.post(`/admin/content/${id}/publish`);
  invalidateCache('/content');
  return data;
}

export async function getCurrentSeason(signal?: AbortSignal): Promise<import('../types').SeasonResponse> {
  return cachedGet('/seasons/current', undefined, TTL.seasons, signal);
}

export async function claimSeasonReward(): Promise<{ ok: boolean; xpEarned: number; totalXp: number }> {
  const { data } = await api.post('/seasons/claim');
  invalidateCache('/seasons');
  invalidateXpDependents();
  return data;
}

export async function exportUserData(): Promise<{ exportedAt: string; userId: string; data: Record<string, unknown[]> }> {
  const { data } = await api.get('/privacy/data/export');
  return data;
}

export async function deleteUserData(): Promise<{ ok: boolean }> {
  const { data } = await api.delete('/privacy/data');
  clearApiCache();
  return data;
}

export async function getTutorModes(signal?: AbortSignal): Promise<import('../types').TutorModes> {
  return cachedGet('/tutor/modes', undefined, TTL.tutorModes, signal);
}

export async function getTutorHistory(mode: string, signal?: AbortSignal): Promise<import('../types').TutorHistory> {
  return cachedGet('/tutor/history', { mode }, TTL.tutorHistory, signal);
}

export async function sendTutorMessage(mode: string, message: string): Promise<import('../types').TutorReply> {
  const { data } = await api.post('/tutor/message', { mode, message });
  invalidateCache('/tutor');
  invalidateCache('/analytics');
  return data;
}

export async function sendTutorStuck(message: string): Promise<import('../types').TutorReply> {
  const { data } = await api.post('/tutor/stuck', { message });
  invalidateCache('/tutor');
  invalidateCache('/analytics');
  return data;
}

export async function getTutorUsage(signal?: AbortSignal): Promise<import('../types').TutorUsage> {
  return cachedGet('/tutor/usage', undefined, TTL.tutorUsage, signal);
}

export async function addVocabularyItems(words: { en: string; es: string }[]): Promise<{ ok: boolean; total: number }> {
  const { data } = await api.post('/vocabulary/items', { words });
  invalidateCache('/vocabulary');
  return data;
}

export async function getVocabulary(signal?: AbortSignal): Promise<{ items: { en: string; es: string; addedAt: string }[]; total: number }> {
  return cachedGet('/vocabulary', undefined, TTL.vocabulary, signal);
}

export async function getLeaderboard(signal?: AbortSignal): Promise<import('../types').Leaderboard> {
  return cachedGet('/leaderboard', undefined, TTL.leaderboard, signal);
}

export async function generateLesson(payload: { skill: string; situation: string; topic: string }): Promise<{ id: string; lesson: import('../types').Post21LessonDetail }> {
  const { data } = await api.post('/content/post21/generate', payload);
  invalidateCache('/content');
  invalidateCache('/analytics');
  return data;
}

export async function getAdvancedStats(days = 7, signal?: AbortSignal): Promise<import('../types').AdvancedStats> {
  return cachedGet(`/analytics/advanced?days=${days}`, undefined, TTL.stats, signal);
}

export async function getMemoryBoard(mode = 'daily', size = '4x4', signal?: AbortSignal): Promise<{
  cards: { id: string; text: string; lang: 'en' | 'es'; category: string; iconSVG: string; pairIndex: number }[];
  seed: string;
  mode: string;
  size: string;
  pairs: number;
}> {
  // El tablero diario es determinista por día (mismo seed): cacheable.
  // El modo libre es aleatorio por partida: NUNCA se cachea.
  const ttl = mode === 'free' ? 0 : TTL.memoryBoardDaily;
  return cachedGet('/memory/board', { mode, size }, ttl, signal);
}

export async function completeMemoryGame(payload: { mode: string; size: string; seed: string; pairs: number; moves: number; timeMs: number }) {
  const { data } = await api.post('/memory/result', payload);
  invalidateCache('/memory');
  invalidateXpDependents();
  return data;
}

export async function getMemoryStats(signal?: AbortSignal): Promise<{
  totalGames: number;
  totalWins: number;
  bestTime: number | null;
  bestMoves: number | null;
  currentStreak: number;
  longestStreak: number;
  lastPlayed: string | null;
  totalXpEarned: number;
}> {
  return cachedGet('/memory/stats', undefined, TTL.memoryStats, signal);
}

export default api;
