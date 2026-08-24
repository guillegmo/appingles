import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { getLeaderboard } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { Card } from '../components/ui/Card';
import type { Leaderboard } from '../types';

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="w-6 text-center text-xs font-bold text-slate-400">{rank}</span>;
}

export function LeaderboardPage() {
  const { user } = useAppStore();
  const [data, setData] = useState<Leaderboard | null>(null);
  const [tab, setTab] = useState<'allTime' | 'weekly'>('allTime');

  useEffect(() => {
    const controller = new AbortController();
    getLeaderboard(controller.signal)
      .then(setData)
      .catch((e) => {
        if ((e as { code?: string })?.code === 'ERR_CANCELED') return;
        setData(null);
      });
    return () => controller.abort();
  }, []);

  const rows = (tab === 'allTime' ? data?.allTime : data?.weekly) ?? [];

  return (
    <div className="p-5">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h1 className="text-xl font-bold">Ligas</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">Compite con otros estudiantes. Gana XP y sube de puesto.</p>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setTab('weekly')}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${tab === 'weekly' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          Esta semana
        </button>
        <button
          onClick={() => setTab('allTime')}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${tab === 'allTime' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          General
        </button>
      </div>

      {data?.me && (
        <Card className="mt-4 flex items-center justify-between border-primary-200 bg-primary-50 p-3">
          <div>
            <p className="text-sm font-bold">{data.me.name} (tú)</p>
            <p className="text-xs text-slate-500">{data.me.totalXp} XP · {data.me.daysCompleted} días</p>
          </div>
          <span className="rounded-full bg-primary-600 px-3 py-1 text-xs font-bold text-white">#{data.me.rank}</span>
        </Card>
      )}

      <div className="mt-4 space-y-2">
        {rows.map((r) => (
          <Card key={r.userId} className={`flex items-center gap-3 p-3 ${r.userId === user?.id ? 'border-primary-300' : ''}`}>
            <Medal rank={r.rank} />
            <div className="flex-1">
              <p className="text-sm font-semibold">{r.name}</p>
              <p className="text-xs text-slate-500">{r.totalXp} XP · {r.daysCompleted} días</p>
            </div>
            {tab === 'weekly' && <span className="text-xs font-semibold text-slate-400">{r.weeklyDays}/7 días</span>}
          </Card>
        ))}
        {rows.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Aún no hay participantes.</p>}
      </div>
    </div>
  );
}