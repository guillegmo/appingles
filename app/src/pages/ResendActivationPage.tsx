import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, MailCheck } from 'lucide-react';
import { resendActivation } from '../services/api';
import { Button } from '../components/ui/Button';

export function ResendActivationPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await resendActivation(email);
      setSent(true);
    } catch {
      setError('No pudimos procesar tu solicitud. Inténtalo de nuevo en un minuto.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-glow">
          <span className="font-display text-3xl font-black leading-none">21</span>
        </div>
        <h1 className="text-2xl font-bold">Recupera tu acceso</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Escribe el correo con el que compraste el Reto de Inglés en 21 Días y te enviaremos un
          enlace para crear tu contraseña o establecer una nueva.
        </p>
      </div>

      {!sent ? (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="tu@email.com"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-primary-500"
            required
          />
          <Button type="submit" size="lg" disabled={sending} className="w-full">
            {sending ? 'Enviando…' : 'Enviarme el enlace'}
          </Button>
          <p className="text-center text-xs text-slate-400">
            <Link to="/login" className="hover:text-primary-600">
              Volver a iniciar sesión
            </Link>
          </p>
        </form>
      ) : (
        <div className="w-full max-w-sm text-center" role="status">
          <MailCheck className="mx-auto mb-4 h-14 w-14 text-primary-600" />
          <p className="mb-1 text-lg font-bold">Revisa tu correo</p>
          <p className="mb-6 text-sm text-slate-500">
            Si tu compra está confirmada, te llegará un correo de
            <span className="font-medium"> acceso@ingresosdigitalesit.com</span> en unos minutos. No
            olvides revisar spam o promociones.
          </p>
          <Link to="/login">
            <Button variant="outline" size="lg" className="w-full">
              Ir a iniciar sesión
            </Button>
          </Link>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 flex w-full max-w-sm items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
