import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, Check, X, ThumbsUp, Sparkles, RotateCcw } from 'lucide-react';
import { getDueCards, submitReviewResult } from '../services/api';
import { speak } from '../utils/speech';
import { Button } from '../components/ui/Button';
import { SpeechSpeedControl } from '../components/SpeechSpeedControl';
import type { ReviewCard } from '../types';

export function SmartReviewPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getDueCards(20);
      setCards(res.items);
      if (res.items.length === 0) setDone(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="p-8 text-center text-slate-500">{error}</div>;

  const current = cards[idx];

  const rate = async (quality: number) => {
    if (!current || saving) return;
    setSaving(true);
    try {
      await submitReviewResult(current.id, quality);
      if (idx + 1 >= cards.length) {
        setDone(true);
      } else {
        setIdx(idx + 1);
        setRevealed(false);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <Sparkles className="h-12 w-12 text-emerald-500" />
        <h1 className="mt-3 text-xl font-bold">¡Repaso completado! 🎉</h1>
        <p className="mt-1 text-sm text-slate-500">Repetición espaciada programada. Vuelve cuando te avise.</p>
        <Button className="mt-6" onClick={() => { setDone(false); setIdx(0); setCards([]); load(); }}>
          <RotateCcw className="mr-1 h-4 w-4" /> Más tarjetas
        </Button>
        <Button className="mt-2" variant="ghost" onClick={() => navigate('/progress')}>Ir a Progreso</Button>
      </div>
    );
  }

  if (!current) return <div className="p-8 text-center text-slate-500">Cargando…</div>;

  return (
    <div className="flex min-h-screen flex-col p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Repaso inteligente</h1>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {idx + 1} / {cards.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">Palabras y frases donde fallaste, con repetición espaciada.</p>
      <div className="mt-2 flex justify-center">
        <SpeechSpeedControl compact />
      </div>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center">
        <button
          onClick={() => { setRevealed(true); speak(current.word); }}
          className={`w-full max-w-sm rounded-3xl border p-8 text-center shadow-sm transition-colors ${
            revealed ? 'border-primary-300 bg-primary-50' : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-2xl font-bold">{current.word}</p>
          {revealed && <p className="mt-3 text-slate-500">{current.es}</p>}
          <p className="mt-4 text-xs text-slate-400">
            {revealed ? 'Toca otra vez para oírla' : 'Toca para ver la respuesta'}
          </p>
        </button>
        <button
          onClick={() => speak(current.word)}
          className="mt-3 rounded-full bg-primary-100 p-3 text-primary-700"
          aria-label="Escuchar palabra"
        >
          <Volume2 className="h-5 w-5" />
        </button>
      </div>

      {revealed ? (
        <div className="mt-6 grid grid-cols-3 gap-2">
          <Button variant="outline" className="flex-col py-3" onClick={() => rate(0)} disabled={saving}>
            <X className="h-5 w-5 text-rose-500" /> <span className="text-[10px]">No lo sé</span>
          </Button>
          <Button variant="outline" className="flex-col py-3" onClick={() => rate(3)} disabled={saving}>
            <Check className="h-5 w-5 text-amber-500" /> <span className="text-[10px]">Cuesta</span>
          </Button>
          <Button variant="outline" className="flex-col py-3" onClick={() => rate(4)} disabled={saving}>
            <ThumbsUp className="h-5 w-5 text-emerald-500" /> <span className="text-[10px]">Fácil</span>
          </Button>
        </div>
      ) : (
        <Button className="mt-6 w-full" size="lg" onClick={() => { setRevealed(true); speak(current.word); }}>
          Ver la respuesta
        </Button>
      )}
      {error && <p className="mt-2 text-center text-xs text-rose-600">{error}</p>}
    </div>
  );
}
