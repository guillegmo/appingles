import { useEffect, useState } from 'react';
import {
  BarChart3,
  Microscope,
  Mic,
  BookOpen,
  Flame,
  Sparkles,
  TrendingUp,
  Target,
  Lock,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getAdvancedStats } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingScreen } from '../components/ui/Spinner';
import type { AdvancedStats } from '../types';

const SKILL_LABELS: Record<string, string> = {
  speaking: 'Hablar',
  listening: 'Escuchar',
  vocabulary: 'Vocabulario',
  grammar: 'Gramática',
  conversation: 'Conversación',
  confidence: 'Confianza',
};

const DAY_LABEL = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });

export function StatsPage() {
  const { entitlements } = useAppStore();
  const [days, setDays] = useState<7 | 30>(7);
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAdvancedStats(days)
      .then(setStats)
      .catch((e) => {
        if (e.response?.status === 403) setBlocked(true);
      })
      .finally(() => setLoading(false));
  }, [days]);

  if (blocked || !entitlements?.canAccessAdvancedStats) {
    return (
      <div className="p-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <BarChart3 className="h-5 w-5 text-primary-600" /> Estadísticas
        </h1>
        <Card className="mt-4">
          <div className="flex flex-col items-center py-8 text-center">
            <Lock className="h-8 w-8 text-slate-300" />
            <p className="mt-3 font-bold">Analytics avanzados</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              Precisión por día, puntaje de pronunciación, uso de tu tutor IA y más. Es parte de Premium IA.
            </p>
            <Button className="mt-4" variant="secondary" onClick={() => (window.location.href = '/premium')}>
              DESBLOQUEAR IA
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loading || !stats) return <LoadingScreen label="Calculando tus estadísticas…" />;

  const maxAccuracy = Math.max(...stats.series.map((s) => s.accuracyPct), 1);

  return (
    <div className="p-5">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <BarChart3 className="h-5 w-5 text-primary-600" /> Estadísticas
        </h1>
        <div className="flex gap-1 rounded-full bg-slate-100 p-1">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${days === d ? 'bg-primary-600 text-white' : 'text-slate-600'}`}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">Analytics avanzados · Premium IA</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <p className="num mt-2 text-2xl font-bold">{stats.accuracy.overall.accuracyPct}%</p>
          <p className="text-xs text-slate-500">precisión general</p>
        </Card>
        <Card className="p-4">
          <Microscope className="h-5 w-5 text-primary-600" />
          <p className="num mt-2 text-2xl font-bold">{stats.pronunciation.averageScore}</p>
          <p className="text-xs text-slate-500">pronunciación media</p>
        </Card>
        <Card className="p-4">
          <Mic className="h-5 w-5 text-amber-500" />
          <p className="num mt-2 text-2xl font-bold">{stats.overview.speakingSessions}</p>
          <p className="text-xs text-slate-500">sesiones speaking</p>
        </Card>
        <Card className="p-4">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <p className="num mt-2 text-2xl font-bold">{stats.ai.totalSessions}</p>
          <p className="text-xs text-slate-500">mensajes tutor IA</p>
        </Card>
        <Card className="p-4">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          <p className="num mt-2 text-2xl font-bold">{stats.overview.vocabularyCount}</p>
          <p className="text-xs text-slate-500">palabras en tu banco</p>
        </Card>
        <Card className="p-4">
          <Flame className="h-5 w-5 text-orange-500" />
          <p className="num mt-2 text-2xl font-bold">{stats.overview.currentStreak}</p>
          <p className="text-xs text-slate-500">racha actual 🔥</p>
        </Card>
      </div>

      <Card className="mt-4">
        <p className="mb-3 flex items-center gap-2 font-semibold">
          <TrendingUp className="h-4 w-4 text-primary-600" /> Precisión por día
        </p>
        <div className={`flex h-32 items-end ${days === 30 ? 'gap-px' : 'gap-1.5'}`}>
          {stats.series.map((d, i) => (
            <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t ${d.attempts === 0 ? 'bg-slate-100' : d.accuracyPct >= 80 ? 'bg-emerald-400' : d.accuracyPct >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                  style={{ height: `${d.attempts === 0 ? 6 : Math.max((d.accuracyPct / maxAccuracy) * 100, 8)}%` }}
                  title={`${DAY_LABEL(d.date)}: ${d.accuracyPct}%`}
                />
              </div>
              {(days === 7 || i % 5 === 0 || i === stats.series.length - 1) && (
                <span className="whitespace-nowrap text-[8px] text-slate-400">{DAY_LABEL(d.date)}</span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-right text-[10px] text-slate-400">% aciertos · últimos {days} días</p>
      </Card>

      <Card className="mt-4">
        <p className="mb-3 flex items-center gap-2 font-semibold">
          <Microscope className="h-4 w-4 text-primary-600" /> Pronunciación
        </p>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary-50 px-4 py-3">
            <p className="num text-2xl font-bold text-primary-700">{stats.pronunciation.averageScore}</p>
            <p className="text-[10px] text-slate-500">promedio</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="num text-2xl font-bold">{stats.pronunciation.bestScore}</p>
            <p className="text-[10px] text-slate-500">mejor</p>
          </div>
          <p className="text-xs text-slate-500">{stats.pronunciation.attempts} frases evaluadas</p>
        </div>
        {stats.pronunciation.recent.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {stats.pronunciation.recent.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="truncate text-sm">“{p.target}”</span>
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${p.score >= 80 ? 'bg-emerald-100 text-emerald-700' : p.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                  {p.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <p className="mb-3 flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-violet-500" /> Tu tutor IA
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-violet-50 p-3">
            <p className="num text-xl font-bold">{stats.ai.usedToday}</p>
            <p className="text-[10px] text-slate-500">mensajes hoy</p>
          </div>
          <div className="rounded-xl bg-violet-50 p-3">
            <p className="num text-xl font-bold">{stats.ai.totalTokens.toLocaleString('es-CO')}</p>
            <p className="text-[10px] text-slate-500">tokens consumidos</p>
          </div>
        </div>
      </Card>

      {stats.skills && (
        <Card className="mt-4">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <Target className="h-4 w-4 text-primary-600" /> Tu perfil de habilidades
          </p>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Nivel actual</p>
            <p className="text-lg font-bold">{stats.skills.level}</p>
            <p className="mt-2 text-xs text-slate-500">Habilidad más fuerte</p>
            <p className="font-semibold">{SKILL_LABELS[stats.skills.strongestSkill] ?? stats.skills.strongestSkill}</p>
            <p className="mt-2 text-xs text-slate-500">Necesita mejorar</p>
            <p className="font-semibold">
              {stats.skills.needsImprovement.map((s) => SKILL_LABELS[s] ?? s).join(', ')}
            </p>
          </div>
        </Card>
      )}

      <Card className="mt-4 border-primary-200 bg-gradient-to-br from-primary-50 to-white">
        <p className="text-sm font-bold text-primary-700">
          {stats.overview.practiceThisWeek} días practicados esta semana · {stats.overview.totalXp} XP totales · {stats.overview.daysCompleted}/21 días del reto
        </p>
      </Card>
    </div>
  );
}