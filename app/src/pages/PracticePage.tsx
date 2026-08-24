import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Repeat, BookOpen, Sun, GraduationCap, Trophy, Headphones, Lock, ArrowRight, Brain } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getReviewCount } from '../services/api';
import { LoadingScreen } from '../components/ui/Spinner';

type PracticeCard = {
  to: string;
  icon: typeof Zap;
  color: string;
  bg: string;
  title: string;
  subtitle: string;
  badge?: string;
  locked?: boolean;
};

// Centro de práctica: atajos a las herramientas de práctica reales en vez de
// repetir la lista de 21 días (que vive en Inicio).
export function PracticePage() {
  const navigate = useNavigate();
  const { challenge, progress, entitlements, refreshAll } = useAppStore();
  const [reviewDue, setReviewDue] = useState(0);

  useEffect(() => {
    refreshAll();
    getReviewCount().then((r) => setReviewDue(r.due)).catch(() => {});
  }, []);

  if (!challenge) return <LoadingScreen label="Cargando práctica…" />;

  const isChampion = (progress?.daysCompleted ?? 0) >= 21;
  const nextDay = challenge.days.find((d) => !d.completed && !d.locked);
  const canVocab = entitlements?.canUseVocabularyBank ?? false;

  const cards: PracticeCard[] = [
    {
      to: '/practice/quick',
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      title: 'Práctica rápida',
      subtitle: 'Ejercicios aleatorios de tus días',
    },
    {
      to: '/review',
      icon: Repeat,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      title: 'Repaso inteligente',
      subtitle: reviewDue > 0 ? `${reviewDue} ${reviewDue === 1 ? 'palabra' : 'palabras'} por recordar hoy` : 'Sin tarjetas hoy',
      badge: reviewDue > 0 ? String(reviewDue) : undefined,
    },
    {
      to: '/vocabulary',
      icon: BookOpen,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      title: 'Vocabulario',
      subtitle: canVocab ? 'Tus palabras falladas' : 'Se arma con tus errores',
      locked: !canVocab,
    },
    {
      to: '/practice/memory/menu',
      icon: Brain,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      title: 'Memory Match',
      subtitle: 'Juego de parejas y vocabulario',
    },
    ...(isChampion
      ? [
          {
            to: '/daily',
            icon: Sun,
            color: 'text-orange-500',
            bg: 'bg-orange-50',
            title: 'Práctica diaria',
            subtitle: '15 min · tu misión de hoy',
          },
          {
            to: '/practice/post21',
            icon: GraduationCap,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            title: 'Aprendizaje continuo',
            subtitle: 'Lecciones por habilidad',
          },
          {
            to: '/seasons',
            icon: Trophy,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            title: 'Retos de temporada',
            subtitle: 'Retos semanales con XP',
          },
          {
            to: '/listening',
            icon: Headphones,
            color: 'text-primary-600',
            bg: 'bg-primary-50',
            title: 'Listening',
            subtitle: 'Entrena tu oído',
          },
        ]
      : []),
  ];

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold">Practicar</h1>
      <p className="text-sm text-slate-500">Ejercicios cortos para reforzar lo aprendido.</p>

      {!isChampion && nextDay && (
        <button
          onClick={() => navigate(`/day/${nextDay.day}`)}
          className="mt-4 flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-4 text-left text-white shadow-soft"
        >
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-100">La misión de hoy</p>
            <p className="text-base font-bold">{nextDay.title}</p>
            <p className="text-xs text-primary-100">Día {nextDay.day} · {nextDay.weekLabel}</p>
          </div>
          <ArrowRight className="h-5 w-5" />
        </button>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {cards.map(({ to, icon: Icon, color, bg, title, subtitle, badge, locked }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-primary-300"
          >
            <div className="flex items-center justify-between">
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </span>
              {badge && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">{badge}</span>
              )}
              {locked && <Lock className="h-4 w-4 text-slate-300" />}
            </div>
            <p className="mt-3 text-sm font-bold">{title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </button>
        ))}
      </div>

      <p className="mt-6 text-center">
        <button onClick={() => navigate('/home')} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
          Ver tu ruta de 21 días →
        </button>
      </p>
    </div>
  );
}