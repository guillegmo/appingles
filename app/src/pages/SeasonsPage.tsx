import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Gift, Lock, Trophy } from 'lucide-react';
import { getCurrentSeason, claimSeasonReward } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import type { SeasonResponse } from '../types';

function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function SeasonsPage() {
  const [season, setSeason] = useState<SeasonResponse | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimedXp, setClaimedXp] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getCurrentSeason();
      setSeason(res);
      setLocked(null);
    } catch (e) {
      const m = (e as Error).message;
      if (m.includes('post21_required')) setLocked(m);
      else setError(m);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (locked) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <Lock className="h-12 w-12 text-slate-300" />
        <h1 className="mt-3 text-xl font-bold">Temporadas</h1>
        <p className="mt-1 max-w-xs text-sm text-slate-500">
          Retos semanales para seguir practicando después del reto de 21 días. Completa el Día 21 para desbloquearlos.
        </p>
      </div>
    );
  }

  if (!season) return <div className="p-8 text-center text-slate-500">{error || 'Cargando…'}</div>;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const r = await claimSeasonReward();
      setClaimedXp(r.xpEarned);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold">Temporadas</h1>
      <p className="mt-1 text-sm text-slate-500">Retos semanales continuos con recompensas en XP.</p>

      <Card className="mt-4 border-primary-200 bg-gradient-to-br from-primary-50 to-white">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary-600" />
          <p className="font-bold">
            {fmtDate(season.season.start)} — {fmtDate(season.season.end)}
          </p>
        </div>
        <p className="mt-1 text-xs text-slate-500">Cada temporada dura {season.seasonDays} días. Se reinicia el lunes.</p>
      </Card>

      <div className="mt-4 space-y-3">
        {season.retos.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-bold">{r.title}</p>
                <p className="text-xs text-slate-500">{r.description}</p>
              </div>
              <div className="ml-3 text-right">
                <p className={`flex items-center gap-1 text-sm font-bold ${r.done ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <Trophy className="h-4 w-4" /> {r.reward} XP
                </p>
                <p className="text-xs text-slate-500">
                  {r.current}/{r.target}
                </p>
              </div>
            </div>
            <ProgressBar value={Math.min(100, Math.round((r.current / r.target) * 100))} className="mt-2" />
          </Card>
        ))}
      </div>

      {claimedXp !== null && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          +{claimedXp} XP reclamados 🎉
        </p>
      )}
      {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      {season.canClaim ? (
        <Button className="mt-4 w-full" size="lg" onClick={handleClaim} disabled={claiming}>
          <Gift className="mr-1 h-4 w-4" /> Reclamar {season.reward} XP
        </Button>
      ) : season.rewardClaimed > 0 ? (
        <Button className="mt-4 w-full" size="lg" disabled>
          <Trophy className="mr-1 h-4 w-4" /> Reclamado esta semana
        </Button>
      ) : (
        <Button className="mt-4 w-full" size="lg" disabled>
          Completa los retos para reclamar XP
        </Button>
      )}
    </div>
  );
}
