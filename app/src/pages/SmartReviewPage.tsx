import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, Sparkles, RotateCcw, Flame, ArrowLeft } from 'lucide-react';
import { getDueCards, submitReviewResult, getDifficultCards, getPoolCards } from '../services/api';
import { speak } from '../utils/speech';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { LoadingScreen } from '../components/ui/Spinner';
import { useAppStore } from '../store/useAppStore';
import type { ReviewCard } from '../types';

// RATINGS quality: 0 (fallo completo) | 1 (muy difícil) | 2 (difícil) | 3 (aceptable)
//                 | 4 (fácil) | 5 (dominado)
const RATINGS = [
  { quality: 0, label: 'No la sabía', hint: 'La verás mañana', icon: '💡' },
  { quality: 1, label: 'Muy difícil', hint: 'Necesita más repaso', icon: '📊' },
  { quality: 2, label: 'Difícil', hint: 'Requiere pensar', icon: '🧠' },
  { quality: 3, label: 'Aceptable', hint: 'Recuerdo con esfuerzo', icon: '✓' },
  { quality: 4, label: '¡Fácil!', hint: 'Repasa más tarde', icon: '⭐' },
  { quality: 5, label: 'Dominado', hint: 'No lo olvidaré', icon: '🏆' },
];

// Modos de repaso disponibles
const REVIEW_MODES = [
  { key: 'due', label: 'Vencidas hoy', description: 'Tarjetas con dueDate <= hoy' },
  { key: 'difficult', label: 'Difíciles', description: 'Palabras con easeFactor bajo' },
  { key: 'pool', label: 'Todas mis fallas', description: 'Todas las palabras que he fallado jamás' },
];

export function SmartReviewPage() {
  const navigate = useNavigate();
  const store = useAppStore();
  const { entitlements } = store;

  // Estado del modo de repaso
  const [mode, setMode] = useState<'due' | 'difficult' | 'pool'>('due');

  // Estado de la tarjeta actual
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; xp: number } | null>(null);

  // Cargar tarjetas según el modo actual
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    setIdx(0);
    setRevealed(false);
    setDone(false);
    setScore(0);
    setStreak(0);
    setXpTotal(0);
    setFeedback(null);
    try {
      let items: ReviewCard[];

      if (mode === 'due') {
        const res = await getDueCards(20, signal);
        items = res.items;
      } else if (mode === 'difficult') {
        const res = await getDifficultCards(20, signal);
        items = res.items;
      } else if (mode === 'pool') {
        if (!entitlements?.canAccessSmartReviewFull) {
          const res = await getPoolCards(20, signal);
          items = res.items;
        } else {
          const res = await getPoolCards(100, signal);
          items = res.items;
        }
      } else {
        items = [];
      }

      setCards(items);
    } catch (e) {
      if ((e as { code?: string })?.code === 'ERR_CANCELED') return;
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [mode, entitlements?.canAccessSmartReviewFull]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const current = cards[idx];

  // Al llegar a una tarjeta nueva, se escucha la palabra sola.
  useEffect(() => {
    if (current && !revealed) speak(current.word);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.word]);

  const rate = async (quality: number) => {
    if (!current || saving) return;
    setSaving(true);
    try {
      const res = await submitReviewResult(current.id, quality);
      useAppStore.getState().applyXp(res.totalXp);
      const correct = quality >= 3;
      const gained = res.xpEarned ?? 0;
      setFeedback({ correct, xp: gained });
      if (correct) {
        setScore((s) => s + 1);
        setStreak((s) => s + 1);
        setXpTotal((x) => x + gained);
      } else {
        setStreak(0);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (!current) return;
    const isLast = idx + 1 >= cards.length;
    const correct = feedback?.correct ?? false;
    if (!correct && isLast) {
      setCards((prev) => [...prev, prev[idx]]);
      setIdx(idx + 1);
    } else if (isLast) {
      setDone(true);
    } else {
      setIdx(idx + 1);
    }
    setRevealed(false);
    setFeedback(null);
    if (isLast) load();
  };

  if (loading) return <LoadingScreen label="Preparando tu repaso…" />;

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg">Error</p>
            <Button className="mt-4" onClick={() => load()}>Reintentar</Button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-8">
        <Sparkles className="h-12 w-12 mb-4" />
        <h1 className="mt-3 text-2xl font-bold">Repaso inteligente</h1>
        <p className="mt-3 text-lg">
          {mode === 'pool'
            ? 'No tienes tarjetas de repaso. Falla un ejercicio y esta lista se llenará con lo que necesitas repasar.'
            : 'No tienes tarjetas por repasar hoy. Se crean cuando fallas un ejercicio.'}
        </p>
        <Button className="mt-6" onClick={() => setMode('due')}>
          Empezar repaso
        </Button>
        {mode !== 'due' && (
          <Button className="mt-2" variant="ghost" onClick={() => setMode('due')}>
            Volver a "Vencidas hoy"
          </Button>
        )}
        <Button className="mt-2" variant="ghost" onClick={() => navigate('/practice')}>
          Ir a Practicar
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-8">
        <Sparkles className="h-12 w-12 mb-4" />
        <h1 className="mt-3 text-3xl font-bold">¡Repaso completado! 🎉</h1>
        <p className="mt-3 text-base">{score}/{cards.length}</p>
        <p className="mt-2 text-sm">{mode === 'pool' ? 'palabras repasadas' : 'tarjetas recordadas'}</p>
        <p className="mt-3">+{xpTotal} XP</p>
        {streak >= 2 && (
          <p className="mt-2">
            <Flame className="h-4 w-4 me-1" /> {streak} aciertos seguidos
          </p>
        )}
        <p className="mt-4">Vuelve mañana: tus tarjetas se programan solas.</p>
        <Button className="mt-6" onClick={() => load()}>
          <RotateCcw className="mr-1 h-4 w-4" /> Otra ronda
        </Button>
        <Button className="mt-2" variant="ghost" onClick={() => navigate('/practice')}>
          Ir a Practicar
        </Button>
      </div>
    );
  }

  const modeInfo = REVIEW_MODES.find((m) => m.key === mode);
  const total = cards.length;
  const pct = Math.round((idx / total) * 100);
  const dominantPct = total > 0 ? Math.round((cards.filter((c) => c.dominant).length / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header with mode selector */}
      <header className="border-b bg-gray-50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/practice')} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-gray-100 hover:bg-gray-50 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Volver a Practicar</span>
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMode(
                  mode === 'due' ? 'difficult' : mode === 'difficult' ? 'pool' : 'due'
                )}
                className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 border border-gray-200 hover:border-primary transition-colors"
                aria-label="Cambiar modo de repaso"
              >
                {modeInfo?.label}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="px-6 py-8 max-w-7xl mx-auto">
        {/* Progress and word display */}
        <div className="mb-8">
          <ProgressBar value={pct} className="w-full" aria-label="Progreso del repaso" />
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">{idx + 1}/{total}</span>
            <span className="text-xs capitalize text-gray-400">{modeInfo?.label}</span>
          </div>
          {mode !== 'pool' && dominantPct > 0 && (
            <p className="mt-1 text-xs font-semibold text-primary">{cards.filter((c) => c.dominant).length} dominadas ({dominantPct}%)</p>
          )}
        </div>

        {/* Después de calificar: solo el contexto, para escucharlo */}
        {feedback ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 shadow-sm md:p-8">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">En contexto</p>
              <div className="mt-4 flex items-center justify-center gap-4">
                <p className="text-xl font-bold leading-snug text-primary">{current.example || current.word}</p>
                <button
                  type="button"
                  onClick={() => speak(current.example || current.word)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-700"
                  aria-label="Escuchar la frase de contexto"
                >
                  <Volume2 className="h-5 w-5" />
                </button>
              </div>
              {current.exampleEs && <p className="mt-2 text-sm italic text-gray-400">{current.exampleEs}</p>}
              <Button className="mt-8" onClick={next}>
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Word card - the hero element */}
            <Card className="bg-white rounded-xl shadow-sm p-6 md:p-8 border border-gray-100">
              {/* Revealed word section */}
              {revealed && (
                <div className="mb-6">
                  <p className="text-5xl font-bold tracking-tight text-primary">{current.word}</p>
                  {current.example && (
                    <div className="mt-4 rounded-xl bg-gray-50 p-4" style={{ borderColor: 'rgba(45, 90, 47, 0.1)' }}>
                      <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">En contexto</p>
                      <div className="mt-1 flex items-start gap-2">
                        <p className="flex-1 break-words">{current.example}</p>
                        <button
                          type="button"
                          onClick={() => speak(current.example!)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                          aria-label="Escuchar la frase de contexto"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                      {current.exampleEs && <p className="mt-1 text-xs italic text-gray-400">{current.exampleEs}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Hidden word section */}
              {!revealed && (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <p className="text-xl font-medium text-gray-400 capitalize">¿Qué significa?</p>
                  <p className="mt-4 text-4xl font-extrabold">{current.word}</p>
                </div>
              )}

              {/* Action: reveal / speak */}
              {!revealed && (
                <div className="mt-8 text-center">
                  <Button
                    className="rounded-full w-14 h-14 bg-primary text-white flex items-center justify-center mb-3"
                    onClick={() => {
                      setRevealed(true);
                      speak(current.word);
                    }}
                    aria-label="Escuchar y revelar significado"
                  >
                    <Volume2 className="h-5 w-5" />
                  </Button>
                  <p className="text-sm">Ver el contexto</p>
                </div>
              )}
            </Card>

            {/* Rating cards - 2×3 grid */}
            {revealed && (
              <div className="mt-8 grid auto-rows-fr grid-cols-3 gap-1.5 sm:gap-3">
                {RATINGS.map(({ quality, label, hint, icon }) => (
                  <button
                    key={quality}
                    onClick={() => rate(quality)}
                    disabled={saving}
                    aria-label={`${label}. ${hint}`}
                    className="flex min-h-0 items-center gap-1.5 rounded-[16px] bg-primary-700 px-1 py-2 text-left shadow-soft transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary-800 hover:shadow-md active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 sm:gap-2 sm:rounded-[18px] sm:px-2 sm:py-3"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px] sm:h-7 sm:w-7 sm:text-sm"
                    >
                      {icon}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-xs font-bold leading-tight text-white sm:text-sm">{label}</span>
                      <span className="mt-0.5 text-[10px] leading-snug text-white/70 sm:text-xs">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!revealed && (
              <Button
                className="w-full rounded-md px-6 py-3 mt-6 text-base font-medium"
                onClick={() => {
                  setRevealed(true);
                  speak(current.word);
                }}
              >
                Revelar palabra y escuchar
              </Button>
            )}
          </>
        )}
      </main>
    </div>
  );
}