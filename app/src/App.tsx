import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, getToken } from './services/firebase';
import { registerSession } from './services/api';
import { useAppStore } from './store/useAppStore';
import { LoadingScreen } from './components/ui/Spinner';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { HomePage } from './pages/HomePage';
import { PracticePage } from './pages/PracticePage';
import { DayViewPage } from './pages/DayViewPage';
import { DailyPracticePage } from './pages/DailyPracticePage';
import { Post21Page } from './pages/Post21Page';
import { Post21LessonPage } from './pages/Post21LessonPage';
import { TutorPage } from './pages/TutorPage';
import { ProgressPage } from './pages/ProgressPage';
import { ProfilePage } from './pages/ProfilePage';
import { PremiumPage } from './pages/PremiumPage';
import { SmartReviewPage } from './pages/SmartReviewPage';
import { VocabularyPage } from './pages/VocabularyPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ListeningPage } from './pages/ListeningPage';
import { CertificatePage } from './pages/CertificatePage';
import { AdminPage } from './pages/AdminPage';
import { SeasonsPage } from './pages/SeasonsPage';
import { PrivacyPage } from './pages/PrivacyPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  const challenge = useAppStore((s) => s.challenge);
  const progress = useAppStore((s) => s.progress);
  const loading = useAppStore((s) => s.loading);
  const hasSeen = localStorage.getItem('appingles_onboarded');
  const onboardingCompleted =
    challenge?.onboardingCompleted ||
    (progress && (progress.daysCompleted > 0 || progress.totalXp > 0)) ||
    !!hasSeen;
  if (user && loading && !onboardingCompleted) return <LoadingScreen label="Cargando tu progreso…" />;
  if (user && !onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  const user = useAppStore((s) => s.user);
  const login = useAppStore((s) => s.login);
  const logout = useAppStore((s) => s.logout);
  const setError = useAppStore((s) => s.setError);

  useEffect(() => {
    const onSessionExpired = () => {
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
      return;
    }
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const token = await getToken();
        if (token) localStorage.setItem('appingles_token', token);
        if (!localStorage.getItem('appingles_user')) {
          localStorage.setItem('appingles_user', fbUser.uid);
          login(fbUser.uid, fbUser.displayName || fbUser.email?.split('@')[0] || 'Student', token ?? undefined);
          registerSession().catch(() => {});
        }
        useAppStore.getState().refreshAll();
      } else {
        logout();
      }
    });
    return () => unsub();
  }, [user, login, logout]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/home" replace /> : <LoginPage />} />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <OnboardingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/premium"
          element={
            <RequireAuth>
              <PremiumPage />
            </RequireAuth>
          }
        />
        <Route
          element={
            <RequireAuth>
              <OnboardingGate>
                <MainLayout />
              </OnboardingGate>
            </RequireAuth>
          }
        >
          <Route path="/home" element={<HomePage />} />
          <Route path="/practice" element={<PracticePage />} />
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
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? '/home' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
