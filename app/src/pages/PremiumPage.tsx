import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Shield, Zap, Gift, AlertTriangle, Bot, Sparkles, Mic, BookOpen, BarChart3, Undo2, Loader2, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getPlans, getCheckoutForPlan, cancelSubscription, trackAnalyticsEvent } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { PlanOption } from '../types';

const AI_FEATURES = [
  { icon: Bot, title: 'Tutor IA', desc: 'Conversa con un tutor que corrige tus errores al momento y te da feedback. 8 modos + voz bilingüe.' },
  { icon: Sparkles, title: 'Lecciones IA on-demand', desc: 'Pide el tema que quieras practicar y se genera una lección solo para ti.' },
  { icon: Mic, title: 'Puntaje de pronunciación', desc: 'Cada ejercicio de speaking recibe un puntaje con IA.' },
  { icon: BookOpen, title: 'Banco de vocabulario IA', desc: 'Se arma con tus errores y lo que el tutor te enseña.' },
  { icon: Zap, title: 'Mensajes IA sin límite', desc: 'Conversa todo lo que quieras. El plan Free tiene 3 mensajes al día.' },
  { icon: BarChart3, title: 'Analytics avanzados', desc: 'Estadísticas profundas de tu progreso, nivel y fluidez.' },
];

const FREE_INCLUDES = [
  'Reto de 21 días completo (gratis para siempre)',
  'Daily Practice y curso post-21',
  'Smart Review (repetición espaciada)',
  'Racha, XP, badges y temporadas',
  '3 mensajes IA al día para probar',
];

function planLabel(plan?: string) {
  if (plan === 'premium-annual') return 'Anual';
  if (plan === 'premium-monthly') return 'Mensual';
  return 'Premium';
}

export function PremiumPage() {
  const navigate = useNavigate();
  const { entitlements, subscription, upgradePremium, refreshAll } = useAppStore();
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  const status = subscription?.status ?? 'free';
  const isPremium = entitlements?.plan === 'premium';

  useEffect(() => {
    trackAnalyticsEvent('paywall_viewed').catch(() => {});
    getPlans().then((p) => {
      setPlans(p.plans);
      if (p.plans.some((x) => x.id === 'annual')) setBilling('annual');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getCheckoutForPlan(billing).then((c) => setCheckoutUrl(c.url)).catch(() => setCheckoutUrl(null));
  }, [billing]);

  const handleCancel = async () => {
    setCanceling(true);
    try {
      await cancelSubscription();
      await refreshAll();
      setCancelMsg('Listo. Volviste a la versión Free: tu reto de 21 días sigue disponible para siempre.');
    } catch (e) {
      setCancelMsg((e as Error).message || 'No se pudo cancelar. Intenta de nuevo.');
    } finally {
      setCanceling(false);
      setConfirmingCancel(false);
    }
  };

  // Premium activo (trialing o active)
  if (isPremium && (status === 'trialing' || status === 'active')) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <Shield className="h-12 w-12 text-emerald-500" />
        <h1 className="mt-3 text-2xl font-bold">¡Ya eres Premium IA! 🎉</h1>
        <p className="mt-2 text-sm text-slate-500">
          Tu suscripción {planLabel(subscription?.plan)} está {status === 'trialing' ? 'en prueba' : 'activa'}. Tienes acceso a
          todo el poder de la IA.
        </p>
        {subscription?.nextBillingDate && status === 'active' && (
          <p className="mt-3 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700">
            Próximo cobro: {new Date(subscription.nextBillingDate).toLocaleDateString()}
          </p>
        )}
        <ul className="mt-5 space-y-1.5 text-left">
          {AI_FEATURES.map((f) => (
            <li key={f.title} className="flex items-start gap-2 text-sm text-slate-600">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {f.title}
            </li>
          ))}
        </ul>
        <Button className="mt-6" onClick={refreshAll}>Volver al Inicio</Button>

        <details className="mt-8 w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 text-left">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
              <Undo2 className="h-4 w-4 text-slate-400" /> ¿Quieres volver a la versión Free?
            </summary>
            <p className="mt-2 text-xs text-slate-500">
              Conservas para siempre el reto de 21 días, Daily Practice, Smart Review, ligas y certificado. Solo pierdes las
              funciones de IA (tutor, lecciones on-demand, pronunciación, banco de vocabulario y analytics avanzados).
            </p>
            {!confirmingCancel ? (
              <Button className="mt-3 w-full" variant="secondary" onClick={() => setConfirmingCancel(true)}>
                Cancelar mi suscripción
              </Button>
            ) : (
              <div className="mt-3 rounded-xl bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-800">
                  ¿Seguro? {status === 'active' && 'Si la cancelas, seguirás con acceso hasta el fin del período ya pagado. Después volverás a Free.'}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button className="flex-1" variant="secondary" onClick={() => setConfirmingCancel(false)} disabled={canceling}>
                    Mantener Premium
                  </Button>
                  <Button className="flex-1" variant="danger" onClick={handleCancel} disabled={canceling}>
                    {canceling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, volver a Free'}
                  </Button>
                </div>
              </div>
            )}
          </details>
      </div>
    );
  }

  const selected = plans.find((p) => p.id === billing);
  const monthly = plans.find((p) => p.id === 'monthly');

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      if (checkoutUrl) {
        await trackAnalyticsEvent('checkout_started', { provider: 'hotmart', plan: billing }).catch(() => {});
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
        <button
          onClick={() => navigate(-1)}
          className="mb-2 flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" /> Volver sin comprar
        </button>
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white">
            <Bot className="h-7 w-7" />
          </div>
          <h1 className="mt-3 text-2xl font-bold">PREMIUM IA</h1>
          <p className="mt-1 text-sm text-slate-500">Tu tutor de inglés con IA. Pago recurrente, cancela cuando quieras.</p>
        </div>

        {cancelMsg && (
          <Card className="mt-6 border-emerald-200 bg-emerald-50 p-4">
            <p className="flex items-center gap-2 font-semibold text-emerald-800">
              <Check className="h-4 w-4" /> Volviste a la versión Free
            </p>
            <p className="mt-1 text-sm text-emerald-700">{cancelMsg}</p>
          </Card>
        )}

        {status === 'past_due' && (
          <Card className="mt-6 border-amber-200 bg-amber-50">
            <p className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle className="h-4 w-4" /> Tu pago está pendiente
            </p>
            <p className="mt-1 text-sm text-amber-700">Revisa tu método de pago o reactiva tu suscripción para recuperar la IA.</p>
          </Card>
        )}
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
              <AlertTriangle className="h-4 w-4" /> Tu suscripción expiró
            </p>
            <p className="mt-1 text-sm text-amber-700">Suscríbete de nuevo para seguir con tu tutor IA.</p>
          </Card>
        )}

        {/* Beneficios IA */}
        <div className="mt-6 space-y-2">
          {AI_FEATURES.map((f) => (
            <Card key={f.title} className="flex items-start gap-3 p-3">
              <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
              <div>
                <p className="text-sm font-bold">{f.title}</p>
                <p className="text-xs text-slate-500">{f.desc}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Qué queda gratis */}
        <details className="mt-5">
          <summary className="cursor-pointer text-xs font-semibold text-slate-500">Lo que tienes gratis para siempre</summary>
          <ul className="mt-2 space-y-1.5">
            {FREE_INCLUDES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {f}
              </li>
            ))}
          </ul>
        </details>

        {/* Planes */}
        <Card className="mt-6 border-primary-200">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-xl border p-3 text-left transition-colors ${billing === 'monthly' ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'}`}
            >
              <p className="text-xs font-semibold text-slate-500">Mensual</p>
              <p className="text-xl font-black">${monthly?.price ?? 15}/mo</p>
              <p className="text-[10px] text-slate-400">Renovación cada mes</p>
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`rounded-xl border p-3 text-left transition-colors ${billing === 'annual' ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'}`}
            >
              <p className="flex items-center gap-1 text-xs font-semibold text-primary-600">
                Anual <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">-45%</span>
              </p>
              <p className="text-xl font-black">${selected?.id === 'annual' ? selected.price : '99'}/año</p>
              <p className="text-[10px] text-slate-400">${selected?.id === 'annual' ? selected.pricePerMonth : '8'}/mes equivalente</p>
            </button>
          </div>
          <Button className="mt-4 w-full" size="lg" onClick={handleUpgrade} disabled={upgrading}>
            {upgrading ? 'Redirigiendo…' : `Empezar con la IA (${billing === 'monthly' ? 'Mensual' : 'Anual'})`}
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