import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Microscope,
  Mic,
  BookOpen,
  Flame,
  Sparkles,
  TrendingUp,
  Target,
  AlertCircle,
} from 'lucide-react';
import { getAdvancedStats } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Tooltip } from '../components/ui/Tooltip';
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
  const [days, setDays] = useState<7 | 30>(7);
  const [stats, setStats] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    getAdvancedStats(days, controller.signal)
      .then(setStats)
      .catch((e) => {
        if ((e as { code?: string })?.code === 'ERR_CANCELED') return;
        setError(e.response?.data?.message || 'No pudimos calcular tus estadísticas.');
      })
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  if (error) {
    return (
      <div className="p-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <BarChart3 className="h-5 w-5 text-primary-600" /> Estadísticas
        </h1>
        <Card className="mt-4">
          <div className="flex flex-col items-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-rose-400" />
            <p className="mt-3 font-bold">No pudimos calcular tus estadísticas</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500">{error}</p>
            <Button className="mt-4" variant="secondary" onClick={load}>
              Reintentar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (loading || !stats) return <LoadingScreen label="Calculando tus estadísticas…" />;

  const maxAccuracy = Math.max(...stats.series.map((s) => s.accuracyPct), 1);
  const phrases = stats.pronunciation.phrases ?? [];
  const goodPhrases = phrases.filter((p) => p.bestScore >= 80);
  const badPhrases = phrases.filter((p) => p.bestScore < 80);

  return (
    <div className="p-5">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <BarChart3 className="h-5 w-5 text-primary-600" /> Estadísticas{' '}
          <Tooltip text="Datos de tu progreso en el reto: precisión, pronunciación, uso de la IA y rachas." />
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
          <p className="text-xs text-slate-500">precisión general{' '}<Tooltip text="Porcentaje de tus respuestas correctas en todos los ejercicios del reto, desde que empezaste." /></p>
        </Card>
        <Card className="p-4">
          <Microscope className="h-5 w-5 text-primary-600" />
          <p className="num mt-2 text-2xl font-bold">{stats.pronunciation.averageScore}</p>
          <p className="text-xs text-slate-500">pronunciación media{' '}<Tooltip text="Promedio de tus puntajes al hablar las frases del reto en voz alta (escala 0-100)." /></p>
        </Card>
        <Card className="p-4">
          <Mic className="h-5 w-5 text-amber-500" />
          <p className="num mt-2 text-2xl font-bold">{stats.overview.speakingSessions}</p>
          <p className="text-xs text-slate-500">sesiones speaking{' '}<Tooltip text="Veces que practicaste hablando en inglés en el modo speaking del reto." /></p>
        </Card>
        <Card className="p-4">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <p className="num mt-2 text-2xl font-bold">{stats.ai.totalSessions}</p>
          <p className="text-xs text-slate-500">mensajes tutor IA{' '}<Tooltip text="Mensajes que le has enviado a tu tutor IA (por ejemplo, para generar lecciones personalizadas)." /></p>
        </Card>
        <Card className="p-4">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          <p className="num mt-2 text-2xl font-bold">{stats.overview.vocabularyCount}</p>
          <p className="text-xs text-slate-500">palabras en tu banco{' '}<Tooltip text="Frases y palabras nuevas que has guardado. Las que fallas en los ejercicios se agregan solas a tu banco de vocabulario." /></p>
        </Card>
        <Card className="p-4">
          <Flame className="h-5 w-5 text-orange-500" />
          <p className="num mt-2 text-2xl font-bold">{stats.overview.currentStreak}</p>
          <p className="text-xs text-slate-500">racha actual 🔥{' '}<Tooltip text="Días consecutivos practicando. Si dejas un día sin practicar, la racha se reinicia (salvo que tengas un congelador de racha)." /></p>
        </Card>
      </div>

      <Card className="mt-4">
        <p className="mb-3 flex items-center gap-2 font-semibold">
          <TrendingUp className="h-4 w-4 text-primary-600" /> Precisión por día{' '}
          <Tooltip text="Tu % de aciertos cada día. Verde = 80% o más, ámbar = 50-79%, rojo = menos de 50%. Las barras grises son días sin ejercicios." />
        </p>
        {days === 7 ? (
          <div className="flex h-32 items-end gap-1.5">
            {stats.series.map((d) => (
              <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t ${d.attempts === 0 ? 'bg-slate-100' : d.accuracyPct >= 80 ? 'bg-emerald-400' : d.accuracyPct >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                    style={{ height: `${d.attempts === 0 ? 6 : Math.max((d.accuracyPct / maxAccuracy) * 100, 8)}%` }}
                    title={`${DAY_LABEL(d.date)}: ${d.accuracyPct}%`}
                  />
                </div>
                <span className="whitespace-nowrap text-[8px] text-slate-400">{DAY_LABEL(d.date)}</span>
              </div>
            ))}
          </div>
        ) : (
          <AccuracyLineChart data={stats.series} />
        )}
        <p className="mt-2 text-right text-[10px] text-slate-400">% aciertos · últimos {days} días</p>
      </Card>

      <Card className="mt-4">
        <p className="mb-3 flex items-center gap-2 font-semibold">
          <Microscope className="h-4 w-4 text-primary-600" /> Pronunciación{' '}
          <Tooltip text="Frases que la IA ha evaluado al hablar en voz alta. Verde = buen nivel (80+), ámbar/rojo = por mejorar. Se muestra tu mejor puntaje por frase." />
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
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-emerald-700">✓ En buen nivel ({goodPhrases.length})</p>
          {goodPhrases.length === 0 && <p className="text-xs text-slate-400">Aún no hay frases con puntaje ≥ 80.</p>}
          {goodPhrases.slice(0, 5).map((p, i) => (
            <div key={`g-${i}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="truncate text-sm">“{p.target}”</span>
              <span className="ml-2 shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{p.bestScore}</span>
            </div>
          ))}
          <p className="pt-1 text-xs font-semibold text-amber-700">✗ Por mejorar ({badPhrases.length})</p>
          {badPhrases.length === 0 && <p className="text-xs text-slate-400">Todas tus frases van bien 🎉</p>}
          {badPhrases.slice(0, 5).map((p, i) => (
            <div key={`b-${i}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="truncate text-sm">“{p.target}”</span>
              <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${p.bestScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{p.bestScore}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4">
        <p className="mb-3 flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-violet-500" /> Tu tutor IA{' '}
          <Tooltip text="Cuánto has usado tu tutor IA hoy y en total." />
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-violet-50 p-3">
            <p className="num text-xl font-bold">{stats.ai.usedToday}</p>
            <p className="text-[10px] text-slate-500">mensajes hoy</p>
          </div>
          <div className="rounded-xl bg-violet-50 p-3">
            <p className="num text-xl font-bold">{stats.ai.totalSessions}</p>
            <p className="text-[10px] text-slate-500">sesiones con el tutor</p>
          </div>
        </div>
      </Card>

      {stats.skills && (
        <Card className="mt-4">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <Target className="h-4 w-4 text-primary-600" /> Tu perfil de habilidades{' '}
            <Tooltip text="Nivel estimado y las habilidades más fuertes o débiles según tu progreso en el reto." />
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
          {stats.overview.practiceThisWeek} días practicados esta semana · {stats.overview.totalXp} XP totales · {stats.overview.daysCompleted}/21 días del reto{' '}
          <Tooltip text="Tu actividad de la última semana y el avance total en el reto de 21 días." />
        </p>
      </Card>
    </div>
  );
}

// Gráfico de línea para la vista de 30 días: solo pinta los días con intentos y
// separa tramos cuando hay días sin actividad, para no inventar tendencia.
function AccuracyLineChart({ data }: { data: { date: string; attempts: number; accuracyPct: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 120;
  const padT = 10;
  const padB = 8;
  const n = data.length;
  const x = (i: number) => (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (pct: number) => H - padB - (Math.min(pct, 100) / 100) * (H - padT - padB);
  const fill = (pct: number) => (pct >= 80 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#fb7185');

  const active = data.map((d, i) => ({ ...d, i })).filter((d) => d.attempts > 0);
  const segments: { x: number; y: number }[][] = [];
  let cur: { x: number; y: number }[] = [];
  let prev = -2;
  for (const d of active) {
    if (d.i !== prev + 1 && cur.length) {
      segments.push(cur);
      cur = [];
    }
    cur.push({ x: x(d.i), y: y(d.accuracyPct) });
    prev = d.i;
  }
  if (cur.length) segments.push(cur);

  return (
    <div>
      <div ref={ref} className="h-32 w-full">
        {active.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Sin datos de precisión en este período
          </div>
        ) : (
          w > 0 && (
            <svg width={w} height={H} className="block">
              {segments.map((seg, k) => (
                <polyline
                  key={k}
                  points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {active.map((d) => (
                <g key={d.date}>
                  <circle cx={x(d.i)} cy={y(d.accuracyPct)} r="4" fill={fill(d.accuracyPct)} stroke="#fff" strokeWidth="1.5" />
                  <title>{`${DAY_LABEL(d.date)}: ${d.accuracyPct}%`}</title>
                </g>
              ))}
            </svg>
          )
        )}
      </div>
      <div className="mt-1 flex">
        {data.map((d, i) => (
          <div key={d.date} className="min-w-0 flex-1 text-center">
            {(i % 5 === 0 || i === data.length - 1) && (
              <span className="whitespace-nowrap text-[8px] text-slate-400">{DAY_LABEL(d.date)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}