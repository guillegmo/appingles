import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { signInEmail, getToken } from '../services/firebase';
import { trackAnalyticsEvent, registerSession } from '../services/api';
import { clearKicked } from '../services/sessionGuard';
import { authLog } from '../services/authLog';
import { friendlyErrorMessage } from '../utils/errors';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.login);
  const refreshAll = useAppStore((s) => s.refreshAll);
  const setError = useAppStore((s) => s.setError);
  const setNotice = useAppStore((s) => s.setNotice);
  const error = useAppStore((s) => s.error);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const finish = async (user: { uid: string; email: string | null; displayName: string | null }) => {
    authLog('AUTH_SUCCESS', { provider: 'email' });
    let token: string | null = null;
    try {
      token = await getToken();
    } catch {
      token = null;
    }
    if (token) sessionStorage.setItem('appingles_token', token);
    sessionStorage.setItem('appingles_user', user.uid);
    authLog('TOKEN_READY', { hasToken: !!token });
    clearKicked();
    try {
      const { replaced } = await registerSession();
      if (replaced) setNotice('Se cerró tu sesión en el otro dispositivo.');
    } catch {}
    const displayName = user.displayName || user.email?.split('@')[0] || 'Student';
    login(user.uid, displayName, token ?? undefined);
    trackAnalyticsEvent('user_registered', { source: 'login' }).catch(() => {});
    // Carga el bootstrap (challenge + progress + subscription) ANTES de navegar.
    // Sin esto, en el primer login en una pestaña limpia OnboardingGate bloquea
    // el montaje de Home y nadie más dispara refreshAll -> loading infinito.
    await refreshAll();
    authLog('SESSION_READY');
    navigate('/home');
    authLog('NAVIGATION_HOME');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    authLog('AUTH_START', { provider: 'email' });
    try {
      const user = await signInEmail(email, password);
      await finish(user);
    } catch (err) {
      authLog('AUTH_ERROR', { provider: 'email', message: friendlyErrorMessage(err) });
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-glow">
          <span className="font-display text-3xl font-black leading-none">21</span>
        </div>
        <h1 className="text-2xl font-bold">Inglés en 21 Días</h1>
        <p className="mt-1 text-sm text-slate-500">Una ruta guiada de 21 días para practicar inglés paso a paso.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="tu@email.com"
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-primary-500"
          required
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Contraseña"
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-primary-500"
          required
          minLength={6}
        />
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Entrando…' : 'Iniciar mi reto'}
        </Button>
      </form>

      {/* Recorrido del reto: 21 estaciones (Día 1 → Día 21). Decorativo. */}
      <div className="mt-6 flex w-full max-w-xs items-center gap-2" aria-hidden="true">
        <span className="text-[10px] font-bold text-slate-400">Día 1</span>
        <div className="flex flex-1 items-center justify-between">
          {Array.from({ length: 21 }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-primary-600' : i === 20 ? 'bg-emerald-500' : 'bg-slate-300'}`}
            />
          ))}
        </div>
        <span className="text-[10px] font-bold text-emerald-600">Día 21</span>
      </div>

      <p className="mt-4 text-xs font-medium text-primary-700">Tu Día 1 comienza aquí.</p>

      {error && (
        <p role="alert" className="mt-3 flex w-full max-w-sm items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
