import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Zap, Flame, Trophy, Clock, ArrowLeft, ChevronRight } from 'lucide-react';
import { getMemoryStats } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingScreen } from '../components/ui/Spinner';

type GameMode = 'daily' | 'free' | 'streak';

interface MemoryStats {
  totalGames: number;
  totalWins: number;
  bestTime: number | null;
  bestMoves: number | null;
  currentStreak: number;
  longestStreak: number;
  lastPlayed: string | null;
  totalXpEarned: number;
}

const MODES: { id: GameMode; icon: typeof Brain; title: string; desc: string; color: string; bg: string; badge?: string }[] = [
  {
    id: 'daily',
    icon: Brain,
    title: 'Desafío diario',
    desc: 'Tablero único para todos. Mismo reto cada día.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    badge: 'Nuevo cada día',
  },
  {
    id: 'free',
    icon: Zap,
    title: 'Partida libre',
    desc: 'Elige dificultad. Juega cuantas veces quieras.',
    color: 'text-primary-600',
    bg: 'bg-primary-50',
  },
  {
    id: 'streak',
    icon: Flame,
    title: 'Modo racha',
    desc: 'Juega días seguidos. Pierdes la racha si fallas un día.',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    badge: 'Protege tu racha',
  },
];

const DIFFICULTIES = [
  { id: '4x4', label: 'Fácil (4×4)', pairs: 8, desc: '8 pares · ~30 seg', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: '4x5', label: 'Medio (4×5)', pairs: 10, desc: '10 pares · ~45 seg', color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: '6x4', label: 'Difícil (6×4)', pairs: 12, desc: '12 pares · ~60 seg', color: 'text-rose-600', bg: 'bg-rose-50' },
];

export function MemoryMenuPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<GameMode>('daily');
  const [selectedDifficulty, setSelectedDifficulty] = useState('4x4');
  const [showDifficulty, setShowDifficulty] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const loadStats = async () => {
      try {
        const res = await getMemoryStats(controller.signal);
        setStats(res);
      } catch (e) {
        if ((e as { code?: string })?.code === 'ERR_CANCELED') return;
        setStats({
          totalGames: 0,
          totalWins: 0,
          bestTime: null,
          bestMoves: null,
          currentStreak: 0,
          longestStreak: 0,
          lastPlayed: null,
          totalXpEarned: 0,
        });
      } finally {
        setLoading(false);
      }
    };
    loadStats();
    return () => controller.abort();
  }, []);

  const handlePlay = () => {
    if (selectedMode === 'free' && !showDifficulty) {
      setShowDifficulty(true);
      return;
    }
    const params = new URLSearchParams({ mode: selectedMode });
    if (selectedMode === 'free') params.set('size', selectedDifficulty);
    navigate(`/practice/memory?${params.toString()}`);
  };

  const formatTime = (ms: number | null) => {
    if (!ms) return '—';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  if (loading) return <LoadingScreen label="Cargando Memory Match…" />;

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate('/practice')} className="rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Memory Match</h1>
      </div>

      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-bold">Memory Match</p>
            <p className="text-sm text-slate-500">Encuentra las parejas EN ↔ ES. Entrena memoria y vocabulario.</p>
          </div>
        </div>
      </Card>

      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400 mb-3">Elige modo</h2>
      <div className="grid grid-cols-1 gap-3 mb-6">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => {
              setSelectedMode(mode.id);
              if (mode.id !== 'free') setShowDifficulty(false);
            }}
            className={`
              relative w-full rounded-xl border-2 p-4 text-left transition-all
              ${selectedMode === mode.id ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-primary-300'}
            `}
          >
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${mode.bg} shrink-0`}>
                <mode.icon className={`h-5 w-5 ${mode.color}`} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{mode.title}</span>
                  {mode.badge && (
                    <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">{mode.badge}</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-500 truncate">{mode.desc}</p>
              </div>
              {selectedMode === mode.id && (
                <ChevronRight className="h-5 w-5 text-primary-500 shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>

      {selectedMode === 'free' && showDifficulty && (
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400 mb-3">Dificultad</h2>
          <div className="grid grid-cols-1 gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => { setSelectedDifficulty(d.id); handlePlay(); }}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${selectedDifficulty === d.id ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-primary-300'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${d.bg} shrink-0`}>
                    <span className={`text-xs font-bold ${d.color}`}>{d.id}</span>
                  </span>
                  <div>
                    <p className="font-bold">{d.label}</p>
                    <p className="text-xs text-slate-500">{d.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handlePlay}
      >
        {selectedMode === 'free' && !showDifficulty ? 'Seleccionar dificultad' : 'Jugar'}
      </Button>

      {stats && (stats.totalGames > 0 || stats.currentStreak > 0) && (
        <div className="mt-8 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Tus estadísticas</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Trophy} label="Partidas" value={stats.totalGames} color="text-amber-600" />
            <StatCard icon={Flame} label="Racha actual" value={stats.currentStreak} color="text-orange-600" />
            <StatCard icon={Clock} label="Mejor tiempo" value={formatTime(stats.bestTime)} color="text-primary-600" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Zap} label="Mejor movimientos" value={stats.bestMoves ?? '—'} color="text-emerald-600" />
            <StatCard icon={Trophy} label="Racha máxima" value={stats.longestStreak} color="text-amber-600" />
            <StatCard icon={Brain} label="XP ganados" value={stats.totalXpEarned} color="text-violet-600" />
          </div>
          {stats.lastPlayed && (
            <p className="text-xs text-slate-400 text-center">Última partida: {new Date(stats.lastPlayed).toLocaleDateString()}</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Trophy; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <Icon className={`h-5 w-5 mx-auto ${color}`} />
      <p className="mt-1 text-xl font-black text-slate-800">{value}</p>
      <p className="text-[10px] font-medium text-slate-500 uppercase">{label}</p>
    </div>
  );
}
