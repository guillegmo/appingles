import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flame, Award, Zap, Lock, Repeat, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getReviewCount } from '../services/api';
import { greeting } from '../utils/dates';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { LoadingScreen } from '../components/ui/Spinner';

export function HomePage() {
  const navigate = useNavigate();
  const { user, challenge, progress, entitlements, refreshAll, loading } = useAppStore();
  const [reviewDue, setReviewDue] = useState(0);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    refreshAll();
    getReviewCount().then((r) => setReviewDue(r.due)).catch(() => {});
  }, []);

  if (loading && !challenge) {
    return <LoadingScreen label="Cargando tu reto…" />;
  }

  const completed = progress?.daysCompleted ?? 0;
  const total = challenge?.days.length ?? 21;
  const pct = Math.round((completed / total) * 100);
  const isChampion = completed >= total;
  const nextDay = (challenge?.days.find((d) => !d.completed && !d.locked) ?? challenge?.days[0]);
  const lockedAfter = entitlements ? entitlements.maxChallengeDay : 7;

  return (
    <div className="p-5">
      <header className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm text-slate-500">{greeting()} 👋</p>
          <h1 className="text-xl font-bold">{user?.name}</h1>
        </div>
        <Link to="/progress" className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
          <Flame className="h-4 w-4 text-orange-500" />
          {progress?.streaks.currentStreak ?? 0} días
        </Link>
      </header>

      {nextDay && !nextDay.locked ? (
        <Card className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Tu viaje de inglés</p>
          <p className="mt-1 text-lg font-bold">
            Día {nextDay.day} / {total}
          </p>
          <ProgressBar value={pct} className="mt-3" />
          <div className="mt-4">
            <p className="text-xs text-slate-500">La misión de hoy:</p>
            <p className="text-base font-semibold">🗣 {nextDay.title}</p>
            <p className="mt-1 text-sm text-slate-500">{nextDay.weekLabel} · 15 minutos</p>
          </div>
          <Button
            className="mt-4 w-full"
            size="lg"
            onClick={() => {
              setNavigating(true);
              navigate(`/day/${nextDay.day}`);
            }}
            disabled={navigating}
          >
            {navigating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</>
            ) : completed === 0 ? 'EMPEZAR' : 'CONTINUAR'}
          </Button>
        </Card>
      ) : isChampion ? (
        <Card className="mt-4 border-primary-200 bg-gradient-to-br from-primary-50 to-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Tu viaje de inglés</p>
          <p className="mt-1 text-lg font-bold">🎉 Reto completado</p>
          <p className="mt-1 text-sm text-slate-600">
            Tu viaje de inglés apenas comienza: práctica diaria, plan personalizado y lecciones por habilidad.
          </p>
          <Button className="mt-4 w-full" size="lg" onClick={() => navigate('/daily')}>
            PRÁCTICA DIARIA
          </Button>
        </Card>
      ) : (
        <Card className="mt-4 border-primary-200 bg-gradient-to-br from-primary-50 to-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Estás en el día {completed}</p>
          <p className="mt-1 text-lg font-bold">Sigue tu racha 🎯</p>
          <p className="mt-1 text-sm text-slate-600">
            Los días {completed + 1}–{total} te esperan con Premium: speaking, tutor IA y más.
          </p>
          <Button className="mt-4 w-full" variant="secondary" onClick={() => navigate('/premium')}>
            DESBLOQUEAR PREMIUM
          </Button>
        </Card>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <Zap className="h-5 w-5 text-amber-500" />
          <p className="mt-2 text-2xl font-bold">{progress?.totalXp ?? 0}</p>
          <p className="text-xs text-slate-500">Puntos XP</p>
        </Card>
        <Card className="p-4">
          <Award className="h-5 w-5 text-primary-600" />
          <p className="mt-2 text-2xl font-bold">{progress?.badges.length ?? 0}</p>
          <p className="text-xs text-slate-500">Insignias</p>
        </Card>
      </div>

      {progress?.level && (
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold capitalize">{progress.level}</p>
            {progress.levelProgress.next && (
              <p className="text-xs text-slate-500">{progress.levelProgress.next.label}</p>
            )}
          </div>
          <ProgressBar value={progress.levelProgress.pct} className="mt-2" />
        </Card>
      )}

      {isChampion && reviewDue > 0 && (
        <Card className="mt-4 border-violet-200 bg-gradient-to-br from-violet-50 to-white">
          <p className="flex items-center gap-2 font-bold text-violet-700">
            <Repeat className="h-5 w-5" /> {reviewDue} {reviewDue === 1 ? 'tarjeta por repasar' : 'tarjetas por repasar'}
          </p>
          <p className="mt-1 text-sm text-slate-600">Repetición espaciada: palabras donde fallaste están listas.</p>
          <Button className="mt-3 w-full" variant="secondary" onClick={() => navigate('/review')}>
            EMPEZAR REPASO
          </Button>
        </Card>
      )}

      {isChampion && (
        <Card className="mt-4 border-primary-200 bg-gradient-to-br from-primary-50 to-white">
          <p className="font-bold text-primary-700">Retos de temporada</p>
          <p className="mt-1 text-sm text-slate-600">
            Retos semanales con recompensas en XP para seguir tu racha de práctica.
          </p>
          <Button className="mt-3 w-full" variant="secondary" onClick={() => navigate('/seasons')}>
            VER TEMPORADAS
          </Button>
        </Card>
      )}

      {completed >= 7 && !entitlements?.canUseRoleplay && (
        <Card className="mt-4 border-primary-200 bg-gradient-to-br from-primary-50 to-white">
          <p className="font-bold text-primary-700">Has completado {completed} días.</p>
          <p className="mt-1 text-sm text-slate-600">
            Imagina un tutor IA que practique contigo cada día: roleplays, conversación y correcciones.
          </p>
          <Link to="/premium">
            <Button className="mt-3 w-full" variant="secondary">PROBAR PREMIUM</Button>
          </Link>
        </Card>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Reto</p>
        <div className="flex flex-wrap gap-2">
          {challenge?.days.map((d) => (
            <div
              key={d.day}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                d.completed
                  ? 'bg-emerald-500 text-white'
                  : d.locked
                    ? 'bg-slate-100 text-slate-300'
                    : 'bg-primary-600 text-white cursor-pointer'
              }`}
              onClick={() => !d.completed && !d.locked && navigate(`/day/${d.day}`)}
            >
              {d.locked ? <Lock className="h-3.5 w-3.5" /> : d.completed ? '✓' : d.day}
            </div>
          ))}
        </div>
        {completed >= lockedAfter && (
          <p className="mt-2 text-xs text-slate-400">
            Los días {lockedAfter + 1}–{total} requieren Premium.
          </p>
        )}
      </div>
    </div>
  );
}
