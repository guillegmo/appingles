import { useEffect, useState } from 'react';
import { Check, Shield, Zap, Gift, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getCheckout, trackAnalyticsEvent } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const FEATURES = [
  'Personalized daily practice',
  'AI conversation tutor',
  'Speaking practice',
  'Real-life roleplays',
  'Smart review',
  'Progress analytics',
  'All 21 days + continuous learning',
];

function trialDaysLeft(trialEnd?: string) {
  if (!trialEnd) return null;
  const ms = new Date(trialEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function PremiumPage() {
  const { entitlements, subscription, upgradePremium, refreshAll } = useAppStore();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const status = subscription?.status ?? 'free';
  const isPremium = entitlements?.plan === 'premium';

  useEffect(() => {
    trackAnalyticsEvent('paywall_viewed').catch(() => {});
    getCheckout().then((c) => setCheckoutUrl(c.url)).catch(() => setCheckoutUrl(null));
  }, []);

  // Premium activo (trialing o active)
  if (isPremium && (status === 'trialing' || status === 'active')) {
    const daysLeft = trialDaysLeft(subscription?.trialEnd);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <Shield className="h-12 w-12 text-emerald-500" />
        <h1 className="mt-3 text-2xl font-bold">¡Ya eres Premium! 🎉</h1>
        <p className="mt-2 text-sm text-slate-500">
          YOUR ENGLISH COACH está {status === 'trialing' ? 'en prueba' : 'activo'}. Todos los días, el tutor IA, los roleplays y el
          repaso inteligente están desbloqueados.
        </p>
        {status === 'trialing' && daysLeft !== null && (
          <p className="mt-3 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700">
            Te quedan {daysLeft} {daysLeft === 1 ? 'día' : 'días'} de prueba
          </p>
        )}
        <Button className="mt-6" onClick={refreshAll}>Volver al Inicio</Button>
      </div>
    );
  }

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      if (checkoutUrl) {
        await trackAnalyticsEvent('checkout_started', { provider: 'hotmart' }).catch(() => {});
        window.location.href = checkoutUrl;
        return;
      }
      // Dev: activar trial local
      await upgradePremium();
      await refreshAll();
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col p-6">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white">
            <Zap className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-2xl font-bold">PRUEBA PREMIUM</h1>
          <p className="mt-1 text-sm text-slate-500">Tu entrenador de inglés. Cada día.</p>
        </div>

        {status === 'canceled' && (
          <Card className="mt-6 border-amber-200 bg-amber-50">
            <p className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" /> Tu suscripción está cancelada
            </p>
            <p className="mt-1 text-sm text-amber-700">Puedes reactivarla cuando quieras.</p>
          </Card>
        )}
        {status === 'expired' && (
          <Card className="mt-6 border-amber-200 bg-amber-50">
            <p className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" /> Tu trial expiró
            </p>
            <p className="mt-1 text-sm text-amber-700">Suscríbete para seguir con tu coach.</p>
          </Card>
        )}

        <Card className="mt-6 border-primary-200">
          <p className="text-xs font-semibold uppercase text-primary-600">Premium</p>
          <p className="mt-1 text-3xl font-black">${import.meta.env.VITE_PRICE_MONTHLY || '15'}/mo</p>
          <p className="text-sm text-slate-500">7 días gratis, luego se renueva mensualmente</p>
          <ul className="mt-4 space-y-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {f}
              </li>
            ))}
          </ul>
          <Button className="mt-6 w-full" size="lg" onClick={handleUpgrade} disabled={upgrading}>
            {upgrading ? 'Redirigiendo…' : 'Empezar prueba gratis'}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-slate-400">
            <Gift className="h-3.5 w-3.5" /> Cancela cuando quieras. Sin trucos.
          </p>
        </Card>

        <p className="mt-4 text-center text-xs text-slate-400">
          Pago procesado de forma segura por Hotmart. Estados verificados en el backend.
        </p>
      </div>
    </div>
  );
}
