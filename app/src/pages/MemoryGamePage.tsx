import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RotateCcw, Check, Flame, Trophy, Clock, ArrowLeft, Sparkles } from 'lucide-react';
import { getMemoryBoard, completeMemoryGame } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { MemoryCard } from '../components/MemoryCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { LoadingScreen } from '../components/ui/Spinner';

interface BoardCard {
  id: string;
  text: string;
  lang: 'en' | 'es';
  category: string;
  iconSVG: string;
  pairIndex: number;
}

interface BoardResponse {
  cards: BoardCard[];
  seed: string;
  mode: string;
  size: string;
  pairs: number;
}

interface CompleteResponse {
  ok: boolean;
  xpEarned: number;
  totalXp: number;
  timeMs: number;
  moves: number;
  pairs: number;
  bonuses: { speed: number; efficiency: number; daily: number };
  streak: { current: number; longest: number; protected: boolean };
  badges: string[];
}

const SIZE_MAP: Record<string, { cols: number; rows: number; pairs: number }> = {
  '4x4': { cols: 4, rows: 4, pairs: 8 },
  '4x5': { cols: 4, rows: 5, pairs: 10 },
  '6x4': { cols: 6, rows: 4, pairs: 12 },
};

export function MemoryGamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') as 'daily' | 'free' | 'streak') || 'daily';
  const sizeParam = searchParams.get('size') || '4x4';
  const size = SIZE_MAP[sizeParam] || SIZE_MAP['4x4'];

  const [board, setBoard] = useState<BoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<CompleteResponse | null>(null);
  const [showResult, setShowResult] = useState(false);

  const timerRef = useRef<number | null>(null);
  const firstFlipRef = useRef(true);

  // Ref al callback de victoria: evita que el efecto de resolución de parejas
  // dependa de handleWin (cuya identidad cambia con cada tick del temporizador)
  // y se re-ejecute programando timeouts duplicados que inflan el contador.
  const handleWinRef = useRef<() => void>(() => {});

  useEffect(() => {
    // En modo dev (StrictMode) el efecto se ejecuta dos veces y ambas respuestas
    // resuelven en momentos distintos. Si la respuesta "vieja" aplica su estado
    // después de que el jugador haya empezado, borra la partida en curso.
    // El flag `ignore` descarta la respuesta de la invocación obsoleta.
    let ignore = false;
    const controller = new AbortController();
    const loadBoard = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getMemoryBoard(mode, sizeParam, controller.signal);
        if (!ignore) {
          setBoard(res);
          setFlippedIds(new Set());
          setMatchedIds(new Set());
          setMoves(0);
          setStartTime(null);
          setElapsedTime(0);
          setCompleted(false);
          setResult(null);
          setShowResult(false);
          firstFlipRef.current = true;
        }
      } catch (e) {
        if ((e as { code?: string })?.code === 'ERR_CANCELED') return;
        if (!ignore) setError((e as Error).message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    loadBoard();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [mode, sizeParam]);

  useEffect(() => {
    if (startTime && !completed) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTime, completed]);

  const handleWin = useCallback(async () => {
    if (!board || completed) return;
    setCompleted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    const finalTime = elapsedTime || (Date.now() - (startTime || Date.now()));

    try {
      const res = await completeMemoryGame({
        mode: board.mode,
        size: board.size,
        seed: board.seed,
        pairs: board.pairs,
        moves,
        timeMs: finalTime,
      });
      useAppStore.getState().applyXp(res.totalXp);
      setResult(res);
      setShowResult(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [board, completed, elapsedTime, startTime, moves]);

  useEffect(() => {
    handleWinRef.current = handleWin;
  }, [handleWin]);

  const handleCardClick = useCallback((cardId: string) => {
    if (flippedIds.has(cardId) || matchedIds.has(cardId) || flippedIds.size >= 2) return;

    if (firstFlipRef.current) {
      setStartTime(Date.now());
      firstFlipRef.current = false;
    }

    setFlippedIds((prev) => new Set(prev).add(cardId));
  }, [flippedIds, matchedIds]);

  useEffect(() => {
    if (flippedIds.size === 2 && board) {
      const [id1, id2] = Array.from(flippedIds);
      const card1 = board.cards.find((c) => c.id === id1);
      const card2 = board.cards.find((c) => c.id === id2);

      // Match si pertenecen al mismo par y uno es en y otro es es
      if (card1 && card2 && card1.pairIndex === card2.pairIndex && card1.lang !== card2.lang) {
        setTimeout(() => {
          setMatchedIds((prev) => {
            const next = new Set(prev).add(id1).add(id2);
            if (next.size === board.pairs * 2) {
              handleWinRef.current();
            }
            return next;
          });
          setFlippedIds(new Set());
          setMoves((m) => m + 1);
        }, 500);
      } else {
        setTimeout(() => {
          setFlippedIds(new Set());
          setMoves((m) => m + 1);
        }, 900);
      }
    }
  }, [flippedIds, board]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  if (loading) return <LoadingScreen label="Preparando tablero…" />;

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-rose-600">{error}</p>
        <Button className="mt-4" onClick={() => navigate('/practice/memory/menu')}>Volver al menú</Button>
      </div>
    );
  }

  if (!board) return <LoadingScreen label="Cargando…" />;

  const { cols, rows, pairs } = size;
  const progress = matchedIds.size / (pairs * 2);

  return (
    <div className="flex min-h-screen flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/practice/memory/menu')} className="rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="Volver">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Memory Match</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
            {moves} mov
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
            <Clock className="h-3.5 w-3.5 inline-block align-middle mr-1" /> {formatTime(elapsedTime)}
          </span>
        </div>
      </div>

      <ProgressBar value={Math.round(progress * 100)} className="mb-4" />

      {mode === 'daily' && (
        <Card className="mb-4 border-amber-200 bg-amber-50/60 text-sm text-center text-amber-700">
          <Sparkles className="h-4 w-4 inline-block mr-1" /> Desafío diario — mismo tablero para todos hoy
        </Card>
      )}

      <div
        className="flex-1 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        role="grid"
        aria-label={`Tablero Memory Match ${cols}×${rows}`}
      >
        {board.cards.map((card) => (
          <MemoryCard
            key={card.id}
            id={card.id}
            text={card.text}
            lang={card.lang}
            category={card.category}
            iconSVG={card.iconSVG}
            matched={matchedIds.has(card.id)}
            flipped={flippedIds.has(card.id)}
            onClick={() => handleCardClick(card.id)}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
        <span>{matchedIds.size / 2} / {pairs} pares</span>
        <span className="mx-1">·</span>
        <span>Mejor: <strong>{moves < pairs * 1.5 ? '⚡ Pocos movimientos' : '—'}</strong></span>
      </div>

      {showResult && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md">
            <div className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mx-auto">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="mt-4 text-xl font-bold">¡Completado!</h2>
              <p className="mt-1 text-sm text-slate-500">{formatTime(result.timeMs)} · {result.moves} movimientos · {result.pairs} pares</p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-2xl font-black text-emerald-700">+{result.xpEarned}</p>
                  <p className="text-[10px] font-medium text-emerald-600 uppercase">XP total</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <p className="text-2xl font-black text-amber-700">{result.bonuses.speed + result.bonuses.efficiency + result.bonuses.daily}</p>
                  <p className="text-[10px] font-medium text-amber-600 uppercase">Bonificaciones</p>
                </div>
                <div className="rounded-xl bg-primary-50 p-3">
                  <p className="text-2xl font-black text-primary-700">{result.streak.current}</p>
                  <p className="text-[10px] font-medium text-primary-600 uppercase">Racha</p>
                </div>
              </div>

              {result.bonuses.speed > 0 && (
                <p className="mt-2 text-xs text-emerald-600 flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" /> Bonus rapidez (+{result.bonuses.speed} XP)
                </p>
              )}
              {result.bonuses.efficiency > 0 && (
                <p className="mt-1 text-xs text-amber-600 flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" /> Bonus eficiencia (+{result.bonuses.efficiency} XP)
                </p>
              )}
              {result.bonuses.daily > 0 && (
                <p className="mt-1 text-xs text-primary-600 flex items-center justify-center gap-1">
                  <Sparkles className="h-3 w-3" /> Desafío diario (+{result.bonuses.daily} XP)
                </p>
              )}
              {result.streak.protected && (
                <p className="mt-1 text-xs text-orange-600 flex items-center justify-center gap-1">
                  <Flame className="h-3 w-3" /> ¡Racha protegida por desafío diario!
                </p>
              )}

              {result.badges.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-1">
                  {result.badges.map((b) => (
                    <span key={b} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">{b}</span>
                  ))}
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => navigate(`/practice/memory?mode=${mode}&size=${sizeParam}`)}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Otra vez
                </Button>
                <Button onClick={() => navigate('/practice/memory/menu')}>
                  <Trophy className="h-4 w-4 mr-1" /> Menú
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
