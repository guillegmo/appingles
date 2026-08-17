import { useEffect, useMemo, useState } from 'react';
import { Headphones, Volume2, Loader2 } from 'lucide-react';
import { getPost21, getPost21Lesson } from '../services/api';
import { speak } from '../utils/speech';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

type Phrase = { en: string; es: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function ListeningPage() {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const index = await getPost21();
        const lesson = index.lessons?.[0];
        if (!lesson) return setLoading(false);
        const detail = await getPost21Lesson(lesson.id);
        setPhrases([...(detail.phrases ?? []), ...(detail.vocabulary ?? [])]);
      } catch {
        setPhrases([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const current = phrases[round];

  const options = useMemo(() => {
    if (!current) return [];
    const distractors = shuffle(phrases.filter((p) => p.es !== current.es).map((p) => p.es)).slice(0, 3);
    return shuffle([current.es, ...distractors]);
  }, [current, phrases]);

  useEffect(() => {
    if (current) speak(current.en);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, current?.en]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="p-5">
        <h1 className="text-xl font-bold">Listening</h1>
        <Card className="mt-4 py-8 text-center text-sm text-slate-500">
          Completa el reto de 21 días para desbloquear el contenido de listening.
        </Card>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / phrases.length) * 100);
    return (
      <div className="p-5">
        <h1 className="text-xl font-bold">Listening</h1>
        <Card className="mt-4 py-8 text-center">
          <p className="text-3xl font-black">{score}/{phrases.length}</p>
          <p className="mt-1 text-sm text-slate-500">aciertos ({pct}%)</p>
          <Button className="mt-5" size="lg" onClick={() => { setRound(0); setScore(0); setSelected(null); setFinished(false); }}>
            Repetir
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2">
        <Headphones className="h-5 w-5 text-primary-600" />
        <h1 className="text-xl font-bold">Listening</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">Escucha y elige qué significa. {round + 1}/{phrases.length}</p>

      <Card className="mt-4">
        <div className="flex flex-col items-center py-4">
          <button
            onClick={() => speak(current.en)}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white shadow-glow"
            aria-label="Escuchar de nuevo"
          >
            <Volume2 className="h-7 w-7" />
          </button>
          <p className="mt-2 text-xs text-slate-400">Toca para reproducir</p>
        </div>

        <div className="space-y-2">
          {options.map((opt) => {
            const isCorrect = selected && opt === current.es;
            const isWrong = selected && opt === selected && opt !== current.es;
            return (
              <button
                key={opt}
                onClick={() => !selected && setSelected(opt)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  isCorrect ? 'border-emerald-500 bg-emerald-50 font-semibold' : isWrong ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {selected && (
          <Button
            className="mt-4 w-full"
            size="lg"
            onClick={() => {
              if (selected === current.es) setScore((s) => s + 1);
              if (round + 1 >= phrases.length) setFinished(true);
              else { setRound((r) => r + 1); setSelected(null); }
            }}
          >
            {round + 1 >= phrases.length ? 'Ver resultado' : 'Siguiente'}
          </Button>
        )}
      </Card>
    </div>
  );
}