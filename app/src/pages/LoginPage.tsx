import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { signInEmail, signUpEmail, signInGoogle, getToken } from '../services/firebase';
import { trackAnalyticsEvent, registerSession } from '../services/api';
import { clearKicked } from '../services/sessionGuard';
import { friendlyErrorMessage } from '../utils/errors';
import { Button } from '../components/ui/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.login);
  const setError = useAppStore((s) => s.setError);
  const setNotice = useAppStore((s) => s.setNotice);
  const error = useAppStore((s) => s.error);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const finish = async (user: { uid: string; email: string | null; displayName: string | null }) => {
    let token: string | null = null;
    try {
      token = await getToken();
    } catch {
      token = null;
    }
    if (token) localStorage.setItem('appingles_token', token);
    localStorage.setItem('appingles_user', user.uid);
    const displayName = user.displayName || user.email?.split('@')[0] || 'Student';
    login(user.uid, displayName, token ?? undefined);
    clearKicked();
    trackAnalyticsEvent('user_registered', { source: mode }).catch(() => {});
    try {
      const { replaced } = await registerSession();
      if (replaced) setNotice('Se cerró tu sesión en el otro dispositivo.');
    } catch {}
    navigate('/home');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = mode === 'login' ? await signInEmail(email, password) : await signUpEmail(email, password, name);
      await finish(user);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInGoogle();
      await finish(user);
    } catch (err) {
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
        <p className="mt-1 text-sm text-slate-500">Una ruta de 21 estaciones hacia el inglés. Con tu entrenador IA.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        {mode === 'signup' && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-primary-500"
            required
          />
        )}
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
          {loading ? 'Cargando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-3 flex w-full max-w-sm items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="mt-3 flex h-11 w-full max-w-sm items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
          />
        </svg>
        Continuar con Google
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="mt-4 text-center text-sm font-semibold text-primary-600 hover:underline"
      >
        {mode === 'login' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Iniciar sesión'}
      </button>
    </div>
  );
}