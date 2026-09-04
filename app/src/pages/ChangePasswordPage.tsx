import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Eye, EyeOff, KeyRound, Loader2, ShieldAlert, X } from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { markPasswordChanged } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { friendlyErrorMessage } from '../utils/errors';
import { Button } from '../components/ui/Button';

const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Una minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Un carácter especial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

// Se muestra cuando un admin asignó una contraseña temporal (panel de admin,
// "Cambiar contraseña"): el admin la conoce, así que se obliga a reemplazarla
// por una que solo el usuario sepa antes de dejarlo pasar al resto de la app.
export function ChangePasswordPage() {
  const navigate = useNavigate();
  const clearMustChangePassword = useAppStore((s) => s.clearMustChangePassword);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const checks = PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(password) }));
  const allValid = checks.every((c) => c.ok);

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
    if (!auth.currentUser) {
      setLocalError('Tu sesión expiró. Vuelve a iniciar sesión.');
      return;
    }
    setLoading(true);
    try {
      await updatePassword(auth.currentUser, password);
      await markPasswordChanged().catch(() => {});
      clearMustChangePassword();
      navigate('/home');
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/requires-recent-login') {
        setLocalError('Por seguridad, vuelve a iniciar sesión y crea tu contraseña de inmediato.');
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
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-glow">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Crea tu propia contraseña</h1>
        <p className="mt-1 text-sm text-slate-500">
          Un administrador te asignó una contraseña temporal. Por seguridad, crea una nueva que solo tú conozcas antes
          de continuar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        <label htmlFor="new-password" className="block text-xs font-semibold text-slate-600">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            id="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? 'text' : 'password'}
            placeholder="Tu contraseña segura"
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 pr-11 text-sm outline-none focus:border-primary-500"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <ul className="space-y-1 rounded-xl bg-slate-50 p-3">
          {checks.map((c) => (
            <li key={c.label} className={`flex items-center gap-2 text-xs ${c.ok ? 'text-emerald-600' : 'text-slate-500'}`}>
              {c.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {c.label}
            </li>
          ))}
        </ul>
        <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-600">
          Confirmar contraseña
        </label>
        <div className="relative">
          <input
            id="confirm-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type={showConfirm ? 'text' : 'password'}
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 pr-11 text-sm outline-none focus:border-primary-500"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button type="submit" size="lg" disabled={loading || !allValid} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" /> Guardar mi nueva contraseña
            </>
          )}
        </Button>
      </form>

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
