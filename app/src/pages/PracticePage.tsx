import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Check, Sun, BookOpen } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { LoadingScreen } from '../components/ui/Spinner';

export function PracticePage() {
  const navigate = useNavigate();
  const { challenge, progress, refreshAll } = useAppStore();

  useEffect(() => {
    refreshAll();
  }, []);

  if (!challenge) return <LoadingScreen label="Cargando reto…" />;

  const isChampion = (progress?.daysCompleted ?? 0) >= 21;
  const weeks = Array.from(new Set(challenge.days.map((d) => d.week)));

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold">Mi primer reto</h1>
      <p className="text-sm text-slate-500">21 días para empezar a hablar inglés.</p>

      {isChampion && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/daily')}
            className="flex flex-col items-center gap-2 rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white px-4 py-4 text-center"
          >
            <Sun className="h-6 w-6 text-primary-600" />
            <span className="text-sm font-bold text-primary-700">Práctica diaria</span>
            <span className="text-xs text-slate-500">15 min · tu misión de hoy</span>
          </button>
          <button
            onClick={() => navigate('/practice/post21')}
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-4 text-center"
          >
            <BookOpen className="h-6 w-6 text-slate-600" />
            <span className="text-sm font-bold text-slate-700">Aprendizaje continuo</span>
            <span className="text-xs text-slate-500">Lecciones por habilidad</span>
          </button>
        </div>
      )}

      {weeks.map((week) => (
        <div key={week} className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Semana {week} · {challenge.days.find((d) => d.week === week)?.weekLabel}
          </p>
          <div className="space-y-2">
            {challenge.days
              .filter((d) => d.week === week)
              .map((d) => (
                <button
                  key={d.day}
                  onClick={() => !d.locked && !d.completed && navigate(`/day/${d.day}`)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    d.locked
                      ? 'border-slate-200 bg-slate-50 opacity-70'
                      : d.completed
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-primary-300'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      d.completed ? 'bg-emerald-500 text-white' : d.locked ? 'bg-slate-200 text-slate-400' : 'bg-primary-600 text-white'
                    }`}
                  >
                    {d.completed ? <Check className="h-4 w-4" /> : d.locked ? <Lock className="h-4 w-4" /> : d.day}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{d.title}</p>
                    <p className="text-xs text-slate-500">{d.topic}</p>
                  </div>
                  {d.locked && <span className="text-[10px] font-bold uppercase text-slate-400">Premium</span>}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
