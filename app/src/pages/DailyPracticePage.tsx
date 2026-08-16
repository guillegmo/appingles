import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Mic, Volume2, Headphones, MessageCircle, BookOpen } from 'lucide-react';
import { getDailyPracticeToday, completeDailyPractice, recordSpeaking } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { speak } from '../utils/speech';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SpeechSpeedControl } from '../components/SpeechSpeedControl';
import { LoadingScreen } from '../components/ui/Spinner';
import type { DailyPracticeToday } from '../types';

const BLOCK_ICONS: Record<string, typeof BookOpen> = {
  Vocabulary: BookOpen,
  Listening: Headphones,
  Speaking: MessageCircle,
};

const BLOCK_LABELS: Record<string, string> = {
  Vocabulary: 'Vocabulario',
  Listening: 'Escuchar',
  Speaking: 'Hablar',
};

const SKILL_LABELS: Record<string, string> = {
  speaking: 'Hablar',
  listening: 'Escuchar',
  vocabulary: 'Vocabulario',
  grammar: 'Gramática',
  conversation: 'Conversación',
  pronunciation: 'Pronunciación',
  reading: 'Lectura',
};

export function DailyPracticePage() {
  const navigate = useNavigate();
  const { refreshAll } = useAppStore();
  const [data, setData] = useState<DailyPracticeToday | null>(null);
  const [activeBlock, setActiveBlock] = useState(0);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await getDailyPracticeToday();
        setData(d);
        setCompleted(d.mission.done);
        setActiveBlock(d.mission.done ? 3 : 0);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingScreen label="Cargando práctica diaria…" />;
  if (error) {
    return (
      <div className="p-5">
        <Card className="mt-4 border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-bold text-amber-800">Práctica diaria no disponible</p>
          <p className="mt-1 text-sm text-amber-700">{error}</p>
          <Button className="mt-4 w-full" variant="secondary" onClick={() => navigate('/home')}>
            Volver al inicio
          </Button>
        </Card>
      </div>
    );
  }
  if (!data) return <LoadingScreen label="Cargando práctica diaria…" />;

  const { mission, lesson } = data;
  const block = mission.blocks[activeBlock];
  const Icon = block ? BLOCK_ICONS[block.block] ?? BookOpen : BookOpen;

  const finishBlock = async (isSpeaking = false) => {
    if (isSpeaking) await recordSpeaking(21);
    setActiveBlock((a) => a + 1);
  };

  const completeAll = async () => {
    await completeDailyPractice(mission.topic);
    setCompleted(true);
    await refreshAll();
  };

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold">Práctica diaria</h1>
      <p className="text-sm text-slate-500">15 minutos · {mission.topic}</p>

      <Card className="mt-4 border-primary-200 bg-gradient-to-br from-primary-50 to-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">El foco de hoy</p>
        <p className="mt-1 text-base font-bold">{SKILL_LABELS[mission.weakSkill] ?? mission.weakSkill}</p>
        <p className="mt-1 text-sm text-slate-600">{mission.goal}</p>
        {mission.done && (
          <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
            <Check className="h-4 w-4" /> Completado hoy
          </p>
        )}
      </Card>

      {!mission.done && (
        <>
          <div className="mt-4 flex gap-2">
            {mission.blocks.map((b, i) => (
              <button
                key={b.block}
                onClick={() => setActiveBlock(i)}
                className={`flex flex-1 flex-col items-center rounded-xl border px-2 py-3 text-xs font-semibold transition-colors ${
                  i === activeBlock
                    ? 'border-primary-500 bg-primary-600 text-white'
                    : i < activeBlock
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                {i < activeBlock ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                <span className="mt-1">{BLOCK_LABELS[b.block] ?? b.block}</span>
                <span className="text-[10px] opacity-70">{b.minutes} min</span>
              </button>
            ))}
          </div>

          <div className="mt-3 flex justify-center">
            <SpeechSpeedControl compact />
          </div>

          {block.block === 'Vocabulary' && lesson && (
            <Card className="mt-4">
              <p className="text-sm font-semibold">Palabras nuevas · {lesson.title}</p>
              <div className="mt-3 space-y-2">
                {lesson.vocabulary.map((v) => (
                  <div key={v.en} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold">{v.en}</p>
                      <p className="text-xs text-slate-500">{v.es}</p>
                    </div>
                    <button
                      onClick={() => speak(v.en)}
                      className="rounded-full bg-primary-100 p-2 text-primary-700"
                      aria-label={`Pronunciar ${v.en}`}
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button className="mt-4 w-full" size="lg" onClick={() => finishBlock()}>
                Escuché y repetí
              </Button>
            </Card>
          )}

          {block.block === 'Listening' && lesson && (
            <Card className="mt-4">
              <p className="text-sm font-semibold">Escuchar · {lesson.title}</p>
              <div className="mt-3 space-y-2">
                {lesson.phrases.map((p) => (
                  <button
                    key={p.en}
                    onClick={() => speak(p.en)}
                    className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold">{p.en}</p>
                      <p className="text-xs text-slate-500">{p.es}</p>
                    </div>
                    <Volume2 className="h-4 w-4 text-primary-600" />
                  </button>
                ))}
              </div>
              <Button className="mt-4 w-full" size="lg" onClick={() => finishBlock()}>
                Escuché y entendí
              </Button>
            </Card>
          )}

          {block.block === 'Speaking' && (
            <Card className="mt-4">
              <p className="text-sm font-semibold">Hablar · en voz alta</p>
              <p className="mt-2 text-sm text-slate-600">{mission.goal}</p>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1" size="lg" onClick={() => finishBlock(true)}>
                  <Mic className="mr-2 h-4 w-4" /> Hablé en voz alta
                </Button>
              </div>
            </Card>
          )}

          {activeBlock >= 3 && (
            <Button className="mt-4 w-full" size="lg" onClick={completeAll}>
              {completed ? '✔ Completado' : 'COMPLETAR PRÁCTICA'}
            </Button>
          )}
        </>
      )}

      {mission.done && (
        <Card className="mt-4 p-6 text-center">
          <p className="text-lg font-bold">🎉 ¡Práctica de hoy completada!</p>
          <p className="mt-1 text-sm text-slate-500">Vuelve mañana para mantener tu racha.</p>
          <Button className="mt-4 w-full" variant="secondary" onClick={() => navigate('/home')}>
            Volver al inicio
          </Button>
        </Card>
      )}
    </div>
  );
}
