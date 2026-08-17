import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flame, Zap, Award, Repeat, Loader2, Headphones, Trophy, BookOpen, Snowflake, BarChart3, GraduationCap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getReviewCount } from '../services/api';
import { greeting } from '../utils/dates';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { LoadingScreen } from '../components/ui/Spinner';
import { DayRoute } from '../components/DayRoute';

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
  const currentDay = nextDay?.day ?? completed + 1;

  return (
    <div className="p-5">
      <header className="flex items-center justify-between py-2">
        <div>
          <p className="text-sm text-slate-500">{greeting()}</p>
          <h1 className="text-2xl font-bold">{user?.name}</h1>
        </div>
        <Link
          to="/progress"
          className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-600"
        >
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="num">{progress?.streaks.currentStreak ?? 0}</span> días
        </Link>
      </header>
      {(progress?.streakFreezes ?? 0) > 0 && (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-sky-500">
          <Snowflake className="h-3 w-3" /> {progress?.streakFreezes} racha congelada disponible
        </p>
      )}

      <Card className="mt-4 overflow-hidden p-0">
        <div className="p-5 pb-4">
          <div className="flex items-center justify-between">
            <p className="station-label text-primary-600">Tu ruta de inglés</p>
            <p className="num text-[11px] font-semibold text-slate-400">
              {completed}/{total} días
            </p>
          </div>

          {!isChampion ? (
            <>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold tracking-tight">
                    {nextDay ? <>Día <span className="num">{nextDay.day}</span></> : 'Ruta completada'}
                  </p>
                  <p className="text-sm text-slate-500">
                    Estación {nextDay ? nextDay.day : total} de {total}
                  </p>
                </div>
                <p className="pb-1 text-xs font-semibold text-slate-400">{pct}%</p>
              </div>
              <ProgressBar value={pct} className="mt-3" />
            </>
          ) : (
            <div className="mt-3">
              <p className="text-2xl font-bold tracking-tight">Ruta completada</p>
              <p className="mt-1 text-sm text-slate-500">Los 21 días recorridos. Tu viaje continúa.</p>
            </div>
          )}

          {nextDay && !nextDay.locked && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs text-slate-500">La misión de hoy</p>
                <p className="text-base font-semibold">{nextDay.title}</p>
              </div>
              <p className="text-xs text-slate-400">{nextDay.weekLabel} · 15 min</p>
            </div>
          )}
        </div>

        {challenge && (
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
            <DayRoute
              days={challenge.days.map((d) => ({ day: d.day, completed: d.completed, locked: d.locked }))}
              currentDay={isChampion ? undefined : currentDay}
              onSelect={(d) => {
                setNavigating(true);
                navigate(`/day/${d}`);
              }}
            />
          </div>
        )}

        <div className="p-5 pt-4">
          {nextDay && !nextDay.locked ? (
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                setNavigating(true);
                navigate(`/day/${nextDay.day}`);
              }}
              disabled={navigating}
            >
              {navigating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</>
              ) : completed === 0 ? 'Empezar Día 1' : 'Continuar Día ' + nextDay.day}
            </Button>
          ) : isChampion ? (
            <Button className="w-full" size="lg" onClick={() => navigate('/daily')}>
              Práctica diaria
            </Button>
          ) : (
            <Button className="w-full" size="lg" variant="secondary" onClick={() => navigate('/premium')}>
              Desbloquear Premium
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <Zap className="h-5 w-5 text-amber-500" />
          <p className="num mt-2 text-2xl font-bold">{progress?.totalXp ?? 0}</p>
          <p className="text-xs text-slate-500">Puntos XP</p>
        </Card>
        <Card className="p-4">
          <Award className="h-5 w-5 text-primary-600" />
          <p className="num mt-2 text-2xl font-bold">{progress?.badges.length ?? 0}</p>
          <p className="text-xs text-slate-500">Insignias</p>
        </Card>
      </div>

      <p className="station-label mt-5 mb-2 text-slate-500">Explora</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/listening">
          <Card className="p-4">
            <Headphones className="h-5 w-5 text-primary-600" />
            <p className="mt-2 text-sm font-semibold">Listening</p>
            <p className="text-xs text-slate-500">Entrena tu oído</p>
          </Card>
        </Link>
        <Link to="/leaderboard">
          <Card className="p-4">
            <Trophy className="h-5 w-5 text-amber-500" />
            <p className="mt-2 text-sm font-semibold">Ligas</p>
            <p className="text-xs text-slate-500">Compete por XP</p>
          </Card>
        </Link>
        <Link to="/vocabulary">
          <Card className="p-4">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            <p className="mt-2 text-sm font-semibold">Vocabulario</p>
            <p className="text-xs text-slate-500">Tus palabras falladas</p>
          </Card>
        </Link>
        <Link to={isChampion ? '/certificate' : '/progress'}>
          <Card className="p-4">
            <Award className="h-5 w-5 text-amber-500" />
            <p className="mt-2 text-sm font-semibold">Certificado</p>
            <p className="text-xs text-slate-500">{isChampion ? 'Descarga tu logro' : '21 días para ganarlo'}</p>
          </Card>
        </Link>
        <Link to="/stats">
          <Card className="p-4">
            <BarChart3 className="h-5 w-5 text-violet-600" />
            <p className="mt-2 text-sm font-semibold">Estadísticas</p>
            <p className="text-xs text-slate-500">{entitlements?.canAccessAdvancedStats ? 'Analytics avanzados' : 'Premium IA'}</p>
          </Card>
        </Link>
        <Link to="/practice/post21">
          <Card className="p-4">
            <GraduationCap className="h-5 w-5 text-sky-600" />
            <p className="mt-2 text-sm font-semibold">Aprendizaje continuo</p>
            <p className="text-xs text-slate-500">{isChampion ? 'Lecciones por habilidad' : 'Al completar el reto'}</p>
          </Card>
        </Link>
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
        <Card className="mt-4 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <p className="flex items-center gap-2 font-bold text-emerald-700">
            <Repeat className="h-5 w-5" /> {reviewDue} {reviewDue === 1 ? 'tarjeta por repasar' : 'tarjetas por repasar'}
          </p>
          <p className="mt-1 text-sm text-slate-600">Repetición espaciada: palabras donde fallaste están listas.</p>
          <Button className="mt-3 w-full" variant="secondary" onClick={() => navigate('/review')}>
            Empezar repaso
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
            Ver temporadas
          </Button>
        </Card>
      )}

      {completed >= 7 && !entitlements?.canUseRoleplay && (
        <Card className="mt-4 border-primary-200 bg-gradient-to-br from-primary-50 to-white">
          <p className="font-bold text-primary-700">Has completado {completed} días.</p>
          <p className="mt-1 text-sm text-slate-600">
            Imagina un tutor IA que practique contigo cada día: conversación, roleplays, correcciones y puntaje de
            pronunciación. Tu reto de 21 días es gratis para siempre; la IA se desbloquea con Premium IA.
          </p>
          <Link to="/premium">
            <Button className="mt-3 w-full" variant="secondary">Desbloquear Premium IA</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}