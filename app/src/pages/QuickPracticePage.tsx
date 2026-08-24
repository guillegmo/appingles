import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, RotateCcw, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getDay, submitExercise } from '../services/api';
import { QuestionCard } from '../components/QuestionCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingScreen } from '../components/ui/Spinner';
import type { DayExercise } from '../types';

type DrillQuestion = { q: DayExercise; day: number; exId: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MAX_DAYS = 6;

// Práctica rápida: ejercicios de tus días completados + el día actual, en orden
// aleatorio. Cada acierto da XP y cada fallo alimenta el Repaso inteligente.
export function QuickPracticePage() {
  const navigate = useNavigate();
  const { challenge } = useAppStore();
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIdx(0);
    setScore(0);
    setDone(false);
    try {
      const days = challenge?.days ?? [];
      const completed = days.filter((d) => d.completed).map((d) => d.day);
      const current = days.find((d) => !d.completed && !d.locked)?.day;
      const completedForDrill = current ? completed.slice(-(MAX_DAYS - 1)) : completed.slice(-MAX_DAYS);
      const pool = [...completedForDrill, ...(current ? [current] : [])];

      const loaded: DrillQuestion[] = [];
      for (const day of pool) {
        try {
          const content = await getDay(day);
          for (const [i, q] of (content.exercises ?? []).entries()) {
            loaded.push({ q, day, exId: `ex-${day}-${i + 1}` });
          }
        } catch {
          // días sin acceso (p. ej. premium vencido): se omiten
        }
      }
      setQuestions(shuffle(loaded));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [challenge]);

  useEffect(() => {
    load();
  }, [load]);

  const current = questions[idx];
  const isLast = idx + 1 >= questions.length;

  const handleCheck = async (correct: boolean) => {
    if (!current || busy) return;
    setBusy(true);
    if (correct) setScore((s) => s + 1);
    try {
      const res = await submitExercise({
        day: current.day,
        exerciseId: current.exId,
        type: current.q.type,
        answer: String(current.q.answer),
        correct,
      });
      useAppStore.getState().applyXp(res.totalXp);
    } catch {
      // no interrumpir la práctica si el guardado falla
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingScreen label="Preparando práctica…" />;

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">{error}</p>
        <Button className="mt-4" onClick={load}>Reintentar</Button>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <h1 className="text-xl font-bold">Práctica rápida</h1>
        </div>
        <Card className="mt-4 py-8 text-center text-sm text-slate-500">
          Aún no hay ejercicios disponibles. Empieza tu día para practicar aquí.
        </Card>
        <Button className="mt-4 w-full" variant="secondary" onClick={() => navigate('/home')}>
          Ir a Inicio
        </Button>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
        <Zap className="h-12 w-12 text-amber-500" />
        <h1 className="mt-3 text-xl font-bold">¡Práctica lista! 🎉</h1>
        <p className="num mt-2 text-4xl font-black">
          {score}/{questions.length}
        </p>
        <p className="mt-1 text-sm text-slate-500">aciertos ({pct}%)</p>
        <Button className="mt-6 w-full" size="lg" onClick={load}>
          <RotateCcw className="mr-1 h-4 w-4" /> Otra ronda
        </Button>
        <Button className="mt-2 w-full" variant="ghost" onClick={() => navigate('/practice')}>
          Ir a Practicar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/practice')} className="rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Práctica rápida</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Ejercicios aleatorios de tus días · día {current.day}
      </p>

      <div className="mt-4">
        <QuestionCard
          key={`${current.day}-${idx}`}
          q={current.q}
          index={idx + 1}
          total={questions.length}
          title="Práctica rápida"
          busy={busy}
          onCheck={handleCheck}
          onContinue={() => {
            if (isLast) setDone(true);
            else setIdx((i) => i + 1);
          }}
          continueLabel={isLast ? 'Ver resultado' : 'Siguiente'}
        />
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        Acierto: +XP · Fallo: se agrega a tu Repaso inteligente
      </p>
    </div>
  );
}