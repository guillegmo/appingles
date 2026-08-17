import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getChallenge, getProgress, getSubscriptionStatus, activatePremiumDev } from '../services/api';
import type { ChallengeIndex, Entitlements, ProgressResponse, SubscriptionStatus } from '../types';

interface AppState {
  user: { id: string; name: string } | null;
  challenge: ChallengeIndex | null;
  progress: ProgressResponse | null;
  entitlements: Entitlements | null;
  subscription: SubscriptionStatus['subscription'] | null;
  loading: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
  notice: string | null;
  setNotice: (msg: string | null) => void;

  login: (id: string, name: string, token?: string) => void;
  logout: () => void;
  loadChallenge: () => Promise<void>;
  loadProgress: () => Promise<void>;
  loadSubscription: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setEntitlements: (e: Entitlements) => void;
  upgradePremium: () => Promise<void>;
}

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
        localStorage.setItem('appingles_user', id);
        if (token) localStorage.setItem('appingles_token', token);
        set({ user: { id, name }, error: null });
      },

      logout: () => {
        if (import.meta.env.VITE_AUTH_MODE === 'firebase') {
          import('../services/firebase').then(({ auth }) => auth.signOut().catch(() => {}));
        }
        localStorage.removeItem('appingles_user');
        localStorage.removeItem('appingles_token');
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

      refreshAll: async () => {
        const { user } = get();
        if (!user) return;
        await Promise.all([get().loadChallenge(), get().loadProgress(), get().loadSubscription()]);
      },

      setEntitlements: (e) => set({ entitlements: e }),

      upgradePremium: async () => {
        const res = await activatePremiumDev();
        set({ subscription: res.subscription, entitlements: res.entitlements });
      },
    }),
    { name: 'appingles-store', partialize: (s) => ({ user: s.user }) },
  ),
);
