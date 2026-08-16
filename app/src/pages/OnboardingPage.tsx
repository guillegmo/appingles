import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { trackAnalyticsEvent, submitOnboarding } from '../services/api';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';

const GOALS = [
  { id: 'travel', label: 'Aprender inglés para viajar', emoji: '✈️' },
  { id: 'conversation', label: 'Mejorar mis conversaciones', emoji: '💬' },
  { id: 'work', label: 'Trabajar en inglés', emoji: '💼' },
  { id: 'interviews', label: 'Preparar entrevistas de trabajo', emoji: '🎯' },
  { id: 'confidence', label: 'Ganar seguridad al hablar', emoji: '🔥' },
  { id: 'movies', label: 'Entender películas y series', emoji: '🎬' },
  { id: 'daily', label: 'Inglés para el día a día', emoji: '📆' },
];

const LEVELS = ['Sé muy pocas palabras', 'Puedo decir frases básicas', 'Puedo tener conversaciones simples'];

export function OnboardingPage() {
  const navigate = useNavigate();
  const progress = useAppStore((s) => s.progress);
  const [goal, setGoal] = useState<string | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const ready = goal && level !== null;
  const hasHistory = (progress?.daysCompleted ?? 0) > 0 || (progress?.totalXp ?? 0) > 0;

  const handleSubmit = async () => {
    if (!goal || level === null || saving) return;
    setSaving(true);
    try {
      await submitOnboarding({ goal, level });
    } catch {
      // si falla el guardado, seguimos con el flag local para no bloquear al usuario
    }
    localStorage.setItem('appingles_onboarded', 'true');
    trackAnalyticsEvent('onboarding_completed', { goal, level }).catch(() => {});
    navigate('/home');
  };

  return (
    <div className="flex min-h-screen flex-col justify-center p-6">
      <h1 className="mb-1 text-2xl font-bold">Tu objetivo</h1>
      <p className="mb-6 text-sm text-slate-500">¿Para qué quieres aprender inglés?</p>
      <div className="grid grid-cols-1 gap-2">
        {GOALS.map((g) => (
          <button
            key={g.id}
            onClick={() => setGoal(g.id)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
              goal === g.id ? 'border-primary-600 bg-primary-50 font-semibold' : 'border-slate-200 bg-white'
            }`}
          >
            <span className="text-xl">{g.emoji}</span>
            {g.label}
          </button>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Tu nivel actual</h2>
      <div className="grid grid-cols-1 gap-2">
        {LEVELS.map((l, i) => (
          <button
            key={l}
            onClick={() => setLevel(i)}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
              level === i ? 'border-primary-600 bg-primary-50 font-semibold' : 'border-slate-200 bg-white'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <Button
        className="mt-8 w-full"
        size="lg"
        disabled={!ready || saving}
        onClick={handleSubmit}
      >
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
        ) : hasHistory ? 'Continuar mi progreso' : 'Empezar Día 1'}
      </Button>
    </div>
  );
}
