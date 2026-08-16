import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 120000,
});

// Auth: en producción se envía el token de Firebase. En modo dev se usa X-Dev-User.
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'dev';

// Session única: un sessionId persistente por dispositivo.
export function getSessionId(): string {
  let sid = localStorage.getItem('appingles_session');
  if (!sid) {
    sid = (crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem('appingles_session', sid);
  }
  return sid;
}

export async function registerSession(): Promise<{ ok: boolean }> {
  const { data } = await api.post('/auth/session', { sessionId: getSessionId() });
  return data;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('appingles_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (AUTH_MODE === 'dev') {
    const userId = localStorage.getItem('appingles_user');
    if (userId) config.headers['X-Dev-User'] = userId;
  }
  const sessionId = localStorage.getItem('appingles_session');
  if (sessionId) config.headers['X-Session-Id'] = sessionId;
  return config;
});

// Si otra sesión tomó el control, fuerza el cierre local y avisa al router.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.data?.code === 'SESSION_EXPIRED') {
      localStorage.removeItem('appingles_user');
      localStorage.removeItem('appingles_token');
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
    return Promise.reject(err);
  },
);

export async function getChallenge(): Promise<import('../types').ChallengeIndex> {
  const { data } = await api.get('/challenge');
  return data;
}

export async function submitOnboarding(payload: { goal: string; level: number }): Promise<{ ok: boolean }> {
  const { data } = await api.post('/challenge/onboarding', payload);
  return data;
}

export async function getDay(day: number): Promise<import('../types').DayContent> {
  const { data } = await api.get(`/challenge/day/${day}`);
  return data;
}

export async function completeDay(day: number) {
  const { data } = await api.post(`/challenge/day/${day}/complete`);
  return data;
}

export async function submitExercise(payload: { day: number; exerciseId: string; type: string; answer: string; correct: boolean }) {
  const { data } = await api.post('/exercises/attempt', payload);
  return data;
}

export async function recordSpeaking(day: number) {
  const { data } = await api.post('/exercises/speaking', { day });
  return data;
}

export async function getProgress(): Promise<import('../types').ProgressResponse> {
  const { data } = await api.get('/challenge/progress');
  return data;
}

export async function getAssessment(): Promise<import('../types').Assessment> {
  const { data } = await api.get('/challenge/assessment');
  return data;
}

export async function completeAssessment(scores: Record<string, number>): Promise<import('../types').AssessmentResult> {
  const { data } = await api.post('/challenge/assessment/complete', { scores });
  return data;
}

export async function getSubscriptionStatus(): Promise<import('../types').SubscriptionStatus> {
  const { data } = await api.get('/subscription/status');
  return data;
}

export async function getCheckout(): Promise<{ url: string | null; dev: boolean }> {
  const { data } = await api.get('/subscription/checkout');
  return data;
}

export async function activatePremiumDev(plan = 'premium', trialDays = 7) {
  const { data } = await api.post('/subscription/activate', { plan, trialDays });
  return data;
}

export async function trackAnalyticsEvent(event: string, meta: Record<string, unknown> = {}) {
  const { data } = await api.post('/analytics/event', { event, meta });
  return data;
}

export async function getDailyPracticeToday(): Promise<import('../types').DailyPracticeToday> {
  const { data } = await api.get('/practice/today');
  return data;
}

export async function completeDailyPractice(topic: string) {
  const { data } = await api.post('/practice/complete', { topic });
  return data;
}

export async function getPost21(skill?: string, situation?: string): Promise<import('../types').Post21Index> {
  const { data } = await api.get('/content/post21', { params: { skill, situation } });
  return data;
}

export async function getPost21Lesson(id: string): Promise<import('../types').Post21LessonDetail> {
  const { data } = await api.get(`/content/post21/${id}`);
  return data;
}

export async function getWeeklyReport(): Promise<import('../types').WeeklyReport> {
  const { data } = await api.get('/report/weekly');
  return data;
}

export async function getSmartReview(): Promise<import('../types').SmartReview> {
  const { data } = await api.get('/review/smart');
  return data;
}

export async function getDueCards(limit = 20): Promise<import('../types').DueCards> {
  const { data } = await api.get('/review/due', { params: { limit } });
  return data;
}

export async function getReviewCount(): Promise<{ due: number }> {
  const { data } = await api.get('/review/count');
  return data;
}

export async function submitReviewResult(cardId: string, quality: number): Promise<{ ok: boolean; card: import('../types').ReviewCard }> {
  const { data } = await api.post(`/review/${cardId}/result`, { quality });
  return data;
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
  return data;
}

export async function getCurrentSeason(): Promise<import('../types').SeasonResponse> {
  const { data } = await api.get('/seasons/current');
  return data;
}

export async function claimSeasonReward(): Promise<{ ok: boolean; xpEarned: number; totalXp: number }> {
  const { data } = await api.post('/seasons/claim');
  return data;
}

export async function exportUserData(): Promise<{ exportedAt: string; userId: string; data: Record<string, unknown[]> }> {
  const { data } = await api.get('/privacy/data/export');
  return data;
}

export async function deleteUserData(): Promise<{ ok: boolean }> {
  const { data } = await api.delete('/privacy/data');
  return data;
}

export async function getTutorModes(): Promise<import('../types').TutorModes> {
  const { data } = await api.get('/tutor/modes');
  return data;
}

export async function getTutorHistory(mode: string): Promise<import('../types').TutorHistory> {
  const { data } = await api.get('/tutor/history', { params: { mode } });
  return data;
}

export async function sendTutorMessage(mode: string, message: string): Promise<import('../types').TutorReply> {
  const { data } = await api.post('/tutor/message', { mode, message });
  return data;
}

export async function sendTutorStuck(message: string): Promise<import('../types').TutorReply> {
  const { data } = await api.post('/tutor/stuck', { message });
  return data;
}

export async function getTutorUsage(): Promise<import('../types').TutorUsage> {
  const { data } = await api.get('/tutor/usage');
  return data;
}

export default api;
