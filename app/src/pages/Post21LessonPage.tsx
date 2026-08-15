import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Volume2, Mic, ArrowLeft } from 'lucide-react';
import { getPost21Lesson, submitExercise, recordSpeaking } from '../services/api';
import { speak } from '../utils/speech';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SpeechSpeedControl } from '../components/SpeechSpeedControl';
import type { Post21LessonDetail } from '../types';

const SKILL_LABELS: Record<string, string> = {
  speaking: 'Hablar',
  listening: 'Escuchar',
  vocabulary: 'Vocabulario',
  grammar: 'Gramática',
  conversation: 'Conversación',
};

const SITUATION_LABELS: Record<string, string> = {
  travel: 'Viajes',
  work: 'Trabajo',
  social: 'Social',
  shopping: 'Compras',
  restaurant: 'Restaurante',
  airport: 'Aeropuerto',
  hotel: 'Hotel',
  phone: 'Teléfono',
  meetings: 'Reuniones',
  interviews: 'Entrevistas',
  'daily-life': 'Vida diaria',
};

export function Post21LessonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Post21LessonDetail | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLesson(await getPost21Lesson(id));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [id]);

  if (error) return <div className="p-8 text-center text-slate-500">{error}</div>;
  if (!lesson) return <div className="p-8 text-center text-slate-500">Cargando…</div>;

  const total = lesson.vocabulary.length;

  const finishLesson = async () => {
    await recordSpeaking(21);
    await submitExercise({ day: 21, exerciseId: lesson.id, type: 'post21', answer: 'lesson', correct: true });
    setDone(true);
  };

  return (
    <div className="p-5">
      <button onClick={() => navigate('/practice')} className="flex items-center gap-1 text-sm font-semibold text-slate-500">
        <ArrowLeft className="h-4 w-4" /> Práctica
      </button>
      <h1 className="mt-2 text-xl font-bold">{lesson.title}</h1>
      <p className="text-sm capitalize text-slate-500">
        {SKILL_LABELS[lesson.skill] ?? lesson.skill} · {SITUATION_LABELS[lesson.situation] ?? lesson.situation} · {lesson.estimatedTime} min
      </p>
      <p className="mt-2 text-sm text-slate-600">{lesson.goal}</p>
      <div className="mt-3 flex justify-center">
        <SpeechSpeedControl compact />
      </div>

      {done ? (
        <Card className="mt-4 p-6 text-center">
          <p className="text-lg font-bold">🎉 Lección completada</p>
          <p className="mt-1 text-sm text-slate-500">¡Sigue practicando mañana!</p>
          <Button className="mt-4 w-full" variant="secondary" onClick={() => navigate('/practice')}>
            Más lecciones
          </Button>
        </Card>
      ) : (
        <>
          <Card className="mt-4">
            <p className="mb-2 text-sm font-semibold">Vocabulario</p>
            <div className="space-y-2">
              {lesson.vocabulary.map((v) => (
                <div key={v.en} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">{v.en}</p>
                    <p className="text-xs text-slate-500">{v.es}</p>
                  </div>
                  <button onClick={() => speak(v.en)} className="rounded-full bg-primary-100 p-2 text-primary-700" aria-label={`Pronunciar ${v.en}`}>
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="mt-4">
            <p className="mb-2 text-sm font-semibold">Frases</p>
            <div className="space-y-2">
              {lesson.phrases.map((p) => (
                <button key={p.en} onClick={() => speak(p.en)} className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left">
                  <div>
                    <p className="text-sm font-semibold">{p.en}</p>
                    <p className="text-xs text-slate-500">{p.es}</p>
                  </div>
                  <Volume2 className="h-4 w-4 text-primary-600" />
                </button>
              ))}
            </div>
          </Card>

          <Card className="mt-4">
            <p className="text-sm font-semibold">Hablar</p>
            <p className="mt-1 text-sm text-slate-600">{lesson.speak}</p>
            <Button className="mt-3 w-full" variant="outline" size="sm" onClick={() => recordSpeaking(21)}>
              <Mic className="mr-1 h-4 w-4" /> Grabé mi voz
            </Button>
          </Card>

          <Card className="mt-4">
            <p className="text-sm font-semibold">Repaso rápido</p>
            {!revealed ? (
              <div className="mt-2">
                <p className="text-base font-semibold">{lesson.vocabulary[quizIndex].es}</p>
                <p className="text-xs text-slate-500">¿Cómo se dice en inglés?</p>
                <div className="mt-3 flex gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => {
                      speak(lesson.vocabulary[quizIndex].en);
                      setRevealed(true);
                    }}
                  >
                    Mostrar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-base font-semibold">{lesson.vocabulary[quizIndex].en}</p>
                <p className="text-xs text-slate-500">{lesson.vocabulary[quizIndex].es}</p>
                <Button
                  className="mt-3 w-full"
                  onClick={() => {
                    setRevealed(false);
                    setQuizIndex((i) => i + 1);
                  }}
                >
                  {quizIndex + 1 < total ? 'Siguiente' : 'Terminar'}
                </Button>
              </div>
            )}
          </Card>

          {quizIndex >= total && !revealed && (
            <Button className="mt-4 w-full" size="lg" onClick={finishLesson}>
              COMPLETAR LECCIÓN
            </Button>
          )}
        </>
      )}
    </div>
  );
}
