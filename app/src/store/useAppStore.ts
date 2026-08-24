import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getChallenge, getProgress, getSubscriptionStatus, activatePremiumDev, clearApiCache } from '../services/api';
import { clearFreshTab } from '../services/tabState';
import type { ChallengeIndex, Entitlements, ProgressResponse, SubscriptionStatus } from '../types';

interface AppState {
  user: { id: string; name: string } | null;
  challenge: ChallengeIndex | null;
  progress: ProgressResponse | null;
  entitlements: Entitlements | null;
  subscription: SubscriptionStatus['subscription'] | null;
  loading: boolean;
  error: string | null;
  notice: string | null;
  setError: (msg: string | null) => void;
  setNotice: (msg: string | null) => void;

  login: (id: string, name: string, token?: string) => void;
  logout: () => void;
  loadChallenge: () => Promise<void>;
  loadProgress: () => Promise<void>;
  loadSubscription: () => Promise<void>;
  refreshAll: (force?: boolean) => Promise<void>;
  setEntitlements: (e: Entitlements) => void;
  upgradePremium: () => Promise<void>;
  applyXp: (totalXp: number, completedDay?: number) => void;
  applyDayComplete: (res: { dayCompleted: number; totalXp: number; currentStreak: number; longestStreak: number; streakFreezes: number; badges: string[] }) => void;
  setSubscription: (subscription: SubscriptionStatus['subscription'], entitlements: Entitlements) => void;
}

// Evita lanzar refreshAll en paralelo (StrictMode en dev + varios callers en
// ráfaga generan llamadas duplicadas al backend).
let refreshInFlight = false;

// Los datos del store se consideran frescos durante esta ventana: navegar entre
// pantallas (Home -> Día -> Home) no re-dispara las 3 llamadas de refreshAll;
// las mutaciones (XP, días completados) actualizan el store directamente.
const FRESH_MS = 30_000;
let lastRefreshAt = 0;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      challenge: null,
      progress: null,
      entitlements: null,
      subscription: null,
      loading: false,
      error: null,
      notice: null,

      setError: (msg) => set({ error: msg }),
      setNotice: (msg) => set({ notice: msg }),

      login: (id, name, token) => {
        sessionStorage.setItem('appingles_user', id);
        if (token) sessionStorage.setItem('appingles_token', token);
        clearApiCache();
        // A partir de aquí hay una sesión real en ESTA pestaña: se levanta el
        // bloqueo de "pestaña fresca" para que onAuthStateChanged pueda hacer
        // el bootstrap normal (token + registerSession + refreshAll).
        clearFreshTab();
        lastRefreshAt = 0;
        set({ user: { id, name }, error: null, challenge: null, progress: null, entitlements: null, subscription: null });
      },

      logout: () => {
        if (import.meta.env.VITE_AUTH_MODE === 'firebase') {
          import('../services/firebase').then(({ auth }) => auth.signOut().catch(() => {}));
        }
        sessionStorage.removeItem('appingles_user');
        sessionStorage.removeItem('appingles_token');
        sessionStorage.removeItem('appingles-store');
        clearApiCache();
        lastRefreshAt = 0;
        set({ user: null, challenge: null, progress: null, entitlements: null, subscription: null, notice: null });
      },

      loadChallenge: async () => {
        set({ loading: true, error: null });
        try {
          const challenge = await getChallenge();
          set({ challenge, entitlements: challenge.entitlements });
        } catch (e) {
          set({ error: (e as Error).message });
        } finally {
          set({ loading: false });
        }
      },

      loadProgress: async () => {
        try {
          const progress = await getProgress();
          set({ progress });
        } catch (e) {
          set({ error: (e as Error).message });
        }
      },

      loadSubscription: async () => {
        try {
          const status = await getSubscriptionStatus();
          set({ subscription: status.subscription, entitlements: status.entitlements });
        } catch (e) {
          set({ error: (e as Error).message });
        }
      },

      refreshAll: async (force = false) => {
        const { user, challenge, progress, subscription } = get();
        if (!user) return;
        // Datos frescos: saltar el refetch (navegación entre pantallas).
        if (!force && challenge && progress && subscription && Date.now() - lastRefreshAt < FRESH_MS) return;
        if (refreshInFlight) return;
        refreshInFlight = true;
        try {
          await Promise.all([get().loadChallenge(), get().loadProgress(), get().loadSubscription()]);
          lastRefreshAt = Date.now();
        } finally {
          refreshInFlight = false;
        }
      },

      setEntitlements: (e) => set({ entitlements: e }),

      upgradePremium: async () => {
        const res = await activatePremiumDev();
        set({ subscription: res.subscription, entitlements: res.entitlements });
      },

      setSubscription: (subscription, entitlements) => set({ subscription, entitlements }),

      applyXp: (totalXp, completedDay) => {
        const { progress, challenge } = get();
        const patch: Partial<AppState> = {};
        if (progress && typeof totalXp === 'number') {
          patch.progress = {
            ...progress,
            totalXp,
            ...(completedDay
              ? {
                  completedDays: [...new Set([...(progress.completedDays ?? []), completedDay])],
                  daysCompleted: progress.daysCompleted + (progress.completedDays?.includes(completedDay) ? 0 : 1),
                }
              : {}),
          };
        }
        if (challenge && completedDay) {
          patch.challenge = {
            ...challenge,
            days: challenge.days.map((d) => (d.day === completedDay ? { ...d, completed: true } : d)),
          };
        }
        if (patch.progress || patch.challenge) set(patch);
      },

      applyDayComplete: (res) => {
        const { progress, challenge } = get();
        const patch: Partial<AppState> = {};
        const already = progress?.completedDays?.includes(res.dayCompleted) ?? false;
        if (progress) {
          patch.progress = {
            ...progress,
            totalXp: res.totalXp,
            daysCompleted: progress.daysCompleted + (already ? 0 : 1),
            completedDays: [...new Set([...(progress.completedDays ?? []), res.dayCompleted])],
            streakFreezes: res.streakFreezes ?? progress.streakFreezes,
            streaks: {
              ...(progress.streaks ?? { todayPracticed: false }),
              currentStreak: res.currentStreak,
              longestStreak: res.longestStreak,
            },
            badges: res.badges ?? progress.badges,
          };
        }
        if (challenge) {
          patch.challenge = {
            ...challenge,
            days: challenge.days.map((d) => (d.day === res.dayCompleted ? { ...d, completed: true } : d)),
          };
        }
        if (patch.progress || patch.challenge) set(patch);
      },
    }),
    {
      name: 'appingles-store',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ user: s.user }),
    },
  ),
);
