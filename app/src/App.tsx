import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, getToken } from './services/firebase';
import { registerSession, validateSession, getSessionId } from './services/api';
import { isKicked, setKicked } from './services/sessionGuard';
import { isFreshTab } from './services/tabState';
import { authLog } from './services/authLog';
import { useAppStore } from './store/useAppStore';
import { LoadingScreen } from './components/ui/Spinner';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { HomePage } from './pages/HomePage';
import { PracticePage } from './pages/PracticePage';
import { QuickPracticePage } from './pages/QuickPracticePage';
import { DayViewPage } from './pages/DayViewPage';
import { DailyPracticePage } from './pages/DailyPracticePage';
import { Post21Page } from './pages/Post21Page';
import { Post21LessonPage } from './pages/Post21LessonPage';
import { TutorPage } from './pages/TutorPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilePage } from './pages/ProfilePage';
import { SmartReviewPage } from './pages/SmartReviewPage';
import { VocabularyPage } from './pages/VocabularyPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ListeningPage } from './pages/ListeningPage';
import { CertificatePage } from './pages/CertificatePage';
import { StatsPage } from './pages/StatsPage';
import { AdminPage } from './pages/AdminPage';
import { SeasonsPage } from './pages/SeasonsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { MemoryMenuPage } from './pages/MemoryMenuPage';
import { MemoryGamePage } from './pages/MemoryGamePage';
import { ActivatePage } from './pages/ActivatePage';
import { ResendActivationPage } from './pages/ResendActivationPage';
import { NoAccessPage } from './pages/NoAccessPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { hasProductAccess } from './utils/access';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

// Autorización de acceso al producto: estar autenticado NO basta. Solo entra
// quien tenga compra vigente (Reto de Inglés en 21 Días o Premium IA). La
// fuente de verdad es subscriptions/{uid} leída por refreshAll.
function AccessGate({ children }: { children: React.ReactNode }) {
  const subscription = useAppStore((s) => s.subscription);
  const mustChangePassword = useAppStore((s) => s.mustChangePassword);
  const error = useAppStore((s) => s.error);
  const refreshAll = useAppStore((s) => s.refreshAll);
  if (!subscription) {
    if (error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
          <p className="text-sm text-slate-600">No pudimos verificar tu acceso: {error}</p>
          <button
            onClick={() => refreshAll(true)}
            className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-700"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return <LoadingScreen label="Verificando tu acceso…" />;
  }
  if (!hasProductAccess(subscription)) return <Navigate to="/sin-acceso" replace />;
  // Contraseña asignada por un admin: se obliga a reemplazarla antes de
  // dejar pasar a cualquier otra pantalla (el admin la conoce, así que no
  // puede quedar como la contraseña definitiva de la cuenta).
  if (mustChangePassword) return <Navigate to="/cambiar-contrasena" replace />;
  return <>{children}</>;
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  const challenge = useAppStore((s) => s.challenge);
  const progress = useAppStore((s) => s.progress);
  const error = useAppStore((s) => s.error);
  const refreshAll = useAppStore((s) => s.refreshAll);
  const hasSeen = localStorage.getItem('appingles_onboarded');
  const onboardingCompleted =
    challenge?.onboardingCompleted ||
    (progress && (progress.daysCompleted > 0 || progress.totalXp > 0)) ||
    !!hasSeen;
  // La fuente de verdad del alta es challenge.onboardingCompleted; progress y
  // el flag local son solo respaldo. No se decide con progress vacío + challenge
  // null: en una restauración de sesión (recarga o 2º dispositivo, sin flag
  // local) progress suele llegar antes que challenge y eso desviaría a /onboarding
  // a usuarios que ya completaron el alta -> "se cierra la sesión" en el último
  // dispositivo. Se espera a challenge para decidir.
  if (user && !challenge) {
    if (error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
          <p className="text-sm text-slate-600">No pudimos cargar tu progreso: {error}</p>
          <button
            onClick={() => refreshAll()}
            className="rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-700"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return <LoadingScreen label="Cargando tu progreso…" />;
  }
  if (user && !onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

// Pestaña/navegador nuevo: sessionStorage es por-pestaña, así que su ausencia
// indica un arranque fresco. Se limpia la sesión local para partir siempre del
// login y nunca restaurar la última vista (aunque sea el mismo navegador).
// La lógica vive en services/tabState.ts (flag mutable); aquí solo se consume.

export default function App() {
  const user = useAppStore((s) => s.user);
  const login = useAppStore((s) => s.login);
  const logout = useAppStore((s) => s.logout);
  const setError = useAppStore((s) => s.setError);

  useEffect(() => {
    if (!isFreshTab()) return;
    // Arranque fresco: se resetea también el store en memoria y la sesión de
    // Firebase para que ninguna pestaña nueva entre con la sesión anterior.
    logout();
    if (import.meta.env.VITE_AUTH_MODE === 'firebase') {
      import('./services/firebase').then(({ auth }) => auth.signOut().catch(() => {}));
    }
  }, [logout]);

  useEffect(() => {
    const onSessionExpired = () => {
      setKicked(true);
      logout();
      setError('Tu sesión se cerró porque iniciaste sesión en otro dispositivo.');
    };
    window.addEventListener('session-expired', onSessionExpired);
    return () => window.removeEventListener('session-expired', onSessionExpired);
  }, [logout, setError]);

  useEffect(() => {
    const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'dev';
    if (AUTH_MODE === 'dev') {
      if (user) useAppStore.getState().refreshAll();
      // Sesión única: al volver a esta pestaña, validamos la sesión. Si otra
      // pestaña tomó el control, la petición devuelve SESSION_EXPIRED y el
      // interceptor expulsa esta pestaña automáticamente (aunque esté inactiva).
      // validateSession es más ligera que getChallenge (el backend solo lee el
      // doc de sesión; getChallenge leía progreso en cada foco de pestaña).
      const onVisible = () => {
        if (document.visibilityState === 'visible' && useAppStore.getState().user) {
          validateSession().catch(() => {});
        }
      };
      document.addEventListener('visibilitychange', onVisible);
      return () => document.removeEventListener('visibilitychange', onVisible);
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible' && useAppStore.getState().user) {
        validateSession().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && isFreshTab()) {
        // Pestaña nueva: no se restaura la sesión anterior; se espera que el
        // signOut del arranque la cierre y el usuario parta del login. En cuanto
        // el usuario inicia sesión manualmente, login() limpia este flag y el
        // handler vuelve a operar con normalidad.
        return;
      }
      if (fbUser) {
        if (isKicked()) return;
        authLog('AUTH_STATE_READY');
        const token = await getToken();
        authLog('TOKEN_READY', { hasToken: !!token });
        // Sesión única: al restaurar una sesión automática (recarga, etc.) solo
        // se reentra si esta pestaña sigue siendo la sesión activa. Si otra
        // tomó el control, no se reclama (evita el ping-pong entre pestañas).
        let activeSessionId: string | null = null;
        try {
          ({ activeSessionId } = await validateSession());
        } catch {}
        if (activeSessionId && activeSessionId !== getSessionId()) {
          setKicked(true);
          logout();
          setError('Tu sesión se cerró porque iniciaste sesión en otro dispositivo.');
          return;
        }
        if (token) sessionStorage.setItem('appingles_token', token);
        if (!sessionStorage.getItem('appingles_user')) {
          sessionStorage.setItem('appingles_user', fbUser.uid);
          login(fbUser.uid, fbUser.displayName || fbUser.email?.split('@')[0] || 'Student', token ?? undefined);
        }
        if (!activeSessionId) {
          try {
            const { replaced } = await registerSession();
            if (replaced) useAppStore.getState().setNotice('Se cerró tu sesión en el otro dispositivo.');
          } catch {}
        }
        await useAppStore.getState().refreshAll();
        authLog('SESSION_READY');
      } else {
        logout();
      }
    });
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      unsub();
    };
  }, [user, login, logout, setError]);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/home" replace /> : <LoginPage />} />
        <Route path="/activar" element={<ActivatePage />} />
        <Route path="/activar-acceso" element={<ResendActivationPage />} />
        <Route
          path="/cambiar-contrasena"
          element={
            <RequireAuth>
              <ChangePasswordPage />
            </RequireAuth>
          }
        />
        <Route
          path="/sin-acceso"
          element={
            <RequireAuth>
              <NoAccessPage />
            </RequireAuth>
          }
        />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <OnboardingPage />
            </RequireAuth>
          }
        />
        {/* Producto único (V9): ya no hay upsell interno de Premium — cualquier
            compra aprobada da acceso completo. Se conserva la ruta como
            redirect por si queda algún enlace viejo guardado. */}
        <Route path="/premium" element={<Navigate to="/home" replace />} />
        <Route
          element={
            <RequireAuth>
              <AccessGate>
                <OnboardingGate>
                  <MainLayout />
                </OnboardingGate>
              </AccessGate>
            </RequireAuth>
          }
        >
          <Route path="/home" element={<HomePage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/practice/quick" element={<QuickPracticePage />} />
          <Route path="/practice/memory/menu" element={<MemoryMenuPage />} />
          <Route path="/practice/memory" element={<MemoryGamePage />} />
          <Route path="/practice/post21" element={<Post21Page />} />
          <Route path="/practice/:id" element={<Post21LessonPage />} />
          <Route path="/daily" element={<DailyPracticePage />} />
          <Route path="/day/:day" element={<DayViewPage />} />
          <Route path="/tutor" element={<TutorPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/review" element={<SmartReviewPage />} />
          <Route path="/seasons" element={<SeasonsPage />} />
          <Route path="/vocabulary" element={<VocabularyPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/listening" element={<ListeningPage />} />
          <Route path="/certificate" element={<CertificatePage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/home' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
