import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Check, KeyRound, ShieldQuestion, X } from 'lucide-react';
import {
  confirmPasswordReset,
  signInWithEmailAndPassword,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { auth, getToken } from '../services/firebase';
import { notifyActivated, registerSession, trackAnalyticsEvent } from '../services/api';
import { clearKicked } from '../services/sessionGuard';
import { authLog } from '../services/authLog';
import { useAppStore } from '../store/useAppStore';
import { friendlyErrorMessage } from '../utils/errors';
import { Button } from '../components/ui/Button';

type Phase = 'loading' | 'form' | 'invalid-code';

const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Una minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Un carácter especial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function ActivatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Nuestro enlace de activación apunta aquí directamente con ?oobCode=...
  // El código lo valida Firebase (verifyPasswordResetCode); la URL nunca
  // determina a qué cuenta se accede.
  const oobCode = params.get('oobCode');

  const login = useAppStore((s) => s.login);
  const refreshAll = useAppStore((s) => s.refreshAll);
  const setNotice = useAppStore((s) => s.setNotice);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>(oobCode ? 'loading' : 'invalid-code');

  const checks = PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(password) }));
  const allValid = checks.every((c) => c.ok);

  // Al montar, validamos el código para mostrar el email destino y detectar
  // códigos inválidos/expirados de inmediato (verify no consume el código).
  useEffect(() => {
    if (!oobCode) return;
    let cancelled = false;
    (async () => {
      try {
        const email = await verifyPasswordResetCode(auth, oobCode);
        if (!cancelled) {
          setEmail(email);
          setPhase('form');
        }
      } catch (err) {
        if (cancelled) return;
        const code = (err as { code?: string })?.code || '';
        if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') {
          setPhase('invalid-code');
        } else {
          setLocalError(friendlyErrorMessage(err));
          setPhase('form');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [oobCode]);

  const finish = async (user: { uid: string; email: string | null; displayName: string | null }) => {
    authLog('AUTH_SUCCESS', { provider: 'activation' });
    let token: string | null = null;
    try {
      token = await getToken();
    } catch {
      token = null;
    }
    if (token) sessionStorage.setItem('appingles_token', token);
    sessionStorage.setItem('appingles_user', user.uid);
    clearKicked();
    try {
      const { replaced } = await registerSession();
      if (replaced) setNotice('Se cerró tu sesión en el otro dispositivo.');
    } catch {}
    const displayName = user.displayName || user.email?.split('@')[0] || 'Student';
    login(user.uid, displayName, token ?? undefined);
    trackAnalyticsEvent('user_registered', { source: 'activation' }).catch(() => {});
    await refreshAll();
    authLog('SESSION_READY');
    navigate('/home');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!allValid) {
      setLocalError('La contraseña no cumple todos los requisitos.');
      return;
    }
    if (password !== confirm) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode as string, password);
      // Login inmediato con la contraseña recién creada.
      const cred = await signInWithEmailAndPassword(auth, email, password);
      notifyActivated().catch(() => {});
      await finish(cred.user);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') {
        setPhase('invalid-code');
      } else if (code === 'auth/weak-password') {
        setLocalError('La contraseña es demasiado débil.');
      } else {
        setLocalError(friendlyErrorMessage(err));
      }
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
        <h1 className="text-2xl font-bold">Activa tu acceso a AppIngles</h1>
        {phase === 'form' && (
          <p className="mt-1 text-sm text-slate-500">
            {email ? (
              <>
                Activando la cuenta <strong className="text-slate-700">{email}</strong>. Crea tu
                contraseña para comenzar.
              </>
            ) : (
              'Crea tu contraseña para comenzar tu Reto de Inglés en 21 Días.'
            )}
          </p>
        )}
      </div>

      {phase === 'loading' && (
        <p className="text-sm text-slate-500">Verificando tu enlace…</p>
      )}

      {phase === 'form' && (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
          <label htmlFor="new-password" className="block text-xs font-semibold text-slate-600">
            Nueva contraseña
          </label>
          <input
            id="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Tu contraseña segura"
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-primary-500"
            required
          />
          <ul className="space-y-1 rounded-xl bg-slate-50 p-3">
            {checks.map((c) => (
              <li
                key={c.label}
                className={`flex items-center gap-2 text-xs ${c.ok ? 'text-emerald-600' : 'text-slate-500'}`}
              >
                {c.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                {c.label}
              </li>
            ))}
          </ul>
          <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-600">
            Confirmar contraseña
          </label>
          <input
            id="confirm-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type="password"
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-primary-500"
            required
          />
          <Button type="submit" size="lg" disabled={loading || !allValid} className="w-full">
            {loading ? (
              'Activando tu cuenta…'
            ) : (
              <>
                <KeyRound className="h-4 w-4" /> Crear mi contraseña y entrar
              </>
            )}
          </Button>
        </form>
      )}

      {phase === 'invalid-code' && (
        <div className="w-full max-w-sm text-center" role="alert">
          <ShieldQuestion className="mx-auto mb-4 h-14 w-14 text-amber-500" />
          <p className="mb-1 text-lg font-bold">Este enlace ya no es válido</p>
          <p className="mb-6 text-sm text-slate-500">
            El enlace puede haber expirado o haber sido utilizado. Solicita uno nuevo con tu correo
            de compra y te enviaremos otro en segundos.
          </p>
          <Link to="/activar-acceso">
            <Button size="lg" className="w-full">
              Solicitar un nuevo enlace
            </Button>
          </Link>
        </div>
      )}

      {localError && (
        <p
          role="alert"
          className="mt-3 flex w-full max-w-sm items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {localError}
        </p>
      )}
    </div>
  );
}
