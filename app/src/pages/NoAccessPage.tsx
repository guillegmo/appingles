import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getCheckout, getPlans, trackAnalyticsEvent } from '../services/api';
import { Button } from '../components/ui/Button';

const LANDING_URL = 'https://www.ingresosdigitalesit.com/reto21ingles';

function fmtUSD(n?: number | null) {
  return n == null || Number.isNaN(n) ? '' : ` — $${n.toFixed(2)} pago único`;
}

export function NoAccessPage() {
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    getCheckout().then((c) => setCheckoutUrl(c.url)).catch(() => setCheckoutUrl(null));
    getPlans().then((p) => setPrice(p.plans.find((x) => x.id === 'lifetime')?.price ?? null)).catch(() => {});
  }, []);

  // El backend prellena email + custom=userId en el link, así que la compra
  // queda ligada a esta cuenta automáticamente (el webhook la reconoce sin
  // pasar por la landing externa genérica, que no sabe quién eres).
  const handleGetAccess = () => {
    setRedirecting(true);
    trackAnalyticsEvent('checkout_started', { provider: 'hotmart', plan: 'lifetime', source: 'no_access_gate' }).catch(() => {});
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      window.open(LANDING_URL, '_blank', 'noreferrer');
      setRedirecting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Tu acceso aún no está activo</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Iniciaste sesión correctamente, pero no encontramos una compra activa asociada a tu cuenta.
        </p>
        <div className="mt-8 space-y-3">
          <Button size="lg" className="w-full" onClick={handleGetAccess} disabled={redirecting}>
            {redirecting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo…</>
            ) : (
              `Obtener acceso${fmtUSD(price)}`
            )}
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={() => navigate('/activar-acceso')}>
            Ya compré, reenviar enlace de activación
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Cerrar sesión
          </Button>
        </div>
        <p className="mt-6 text-xs text-slate-400">
          ¿Compraste hace poco? El correo de activación puede tardar unos minutos en llegar. Revisa
          spam o promociones.
        </p>
      </div>
    </div>
  );
}
