import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Volume2, Mic, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { getPost21Lesson, submitExercise, recordSpeaking, scorePronunciation } from '../services/api';
import { speak } from '../utils/speech';
import { isSpanish } from '../utils/language';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SpeechSpeedControl } from '../components/SpeechSpeedControl';
import { LoadingScreen } from '../components/ui/Spinner';
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
  const { entitlements } = useAppStore();
  const [lesson, setLesson] = useState<Post21LessonDetail | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognitionLang, setRecognitionLang] = useState<'es-CO' | 'en-US'>('en-US');
  const [saidCorrect, setSaidCorrect] = useState<Set<string>>(new Set());
  const [pronScore, setPronScore] = useState<{ target: string; score: number } | null>(null);
  const [voiceDone, setVoiceDone] = useState(false);

  const speech = useSpeechRecognition({ lang: recognitionLang });

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

  useEffect(() => {
    return () => {
      speech.stop();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!speech.transcript || !lesson) return;
    const spoken = speech.transcript;
    setSaidCorrect((prev) => {
      const next = new Set(prev);
      lesson.phrases.forEach((p) => {
        if (!next.has(p.en) && phraseMatches(p.en, spoken)) next.add(p.en);
      });
      return next;
    });
    if (entitlements?.canScorePronunciation) {
      const attempted = lesson.phrases.find((p) => phraseMatches(p.en, spoken)) ?? lesson.phrases[0];
      if (attempted) {
        scorePronunciation({ transcript: spoken, target: attempted.en, day: 21 })
          .then((r) => setPronScore({ target: attempted.en, score: r.score }))
          .catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.transcript, lesson]);

  if (error) return <div className="p-8 text-center text-slate-500">{error}</div>;
  if (!lesson) return <LoadingScreen label="Cargando lección…" />;

  const total = lesson.vocabulary.length;

  // Compara lo dicho con la frase objetivo (normalizada).
  const phraseMatches = (target: string, spoken: string) => {
    const norm = (s: string) =>
      s.toLowerCase().replace(/[.,!?¡¿'’]/g, '').split(/\s+/).filter(Boolean);
    const t = norm(target);
    const sp = norm(spoken);
    if (!t.length || !sp.length) return false;
    const set = new Set(t);
    let hits = 0;
    for (const w of sp) if (set.has(w)) hits++;
    return hits / t.length >= 0.8;
  };

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

            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500">Di estas frases:</p>
                <div className="flex gap-1 rounded-full bg-white p-0.5">
                  {(['en-US', 'es-CO'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setRecognitionLang(l)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        recognitionLang === l ? 'bg-primary-600 text-white' : 'text-slate-500'
                      }`}
                    >
                      {l === 'en-US' ? 'EN' : 'ES'}
                    </button>
                  ))}
                </div>
              </div>
              <ul className="mt-2 space-y-1">
                {lesson.phrases.map((p) => (
                  <li key={p.en} className="flex items-center justify-between text-sm">
                    <span className={saidCorrect.has(p.en) ? 'font-semibold text-emerald-600' : 'text-slate-700'}>
                      {p.en}
                    </span>
                    {saidCorrect.has(p.en) && <Check className="h-4 w-4 text-emerald-500" />}
                  </li>
                ))}
              </ul>
            </div>

            {speech.supported ? (
              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={() => (speech.listening ? speech.stop() : speech.start())}
              >
                {speech.listening ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Escuchando… toca para detener</>
                ) : (
                  <><Mic className="h-4 w-4" /> {speech.transcript ? 'Reintentar' : 'Grabar mi voz'}</>
                )}
              </Button>
            ) : (
              <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-center text-xs font-semibold text-amber-700">
                Tu navegador no soporta el micrófono. Usa Chrome o Edge para grabar tu voz.
              </p>
            )}

            {speech.transcript && (
              <div className="mt-3">
                <div className="w-full rounded-lg bg-slate-100 p-3 text-center text-sm font-medium">
                  “{speech.transcript}”
                </div>
                {isSpanish(speech.transcript) && (
                  <p className="mt-2 w-full rounded-xl bg-amber-100 px-4 py-3 text-center text-sm font-semibold text-amber-800">
                    🗣️ Lo dijiste en español. ¡Inténtalo en inglés!
                  </p>
                )}
                {pronScore && entitlements?.canScorePronunciation && (
                  <div className="mt-2 flex w-full items-center justify-between rounded-xl bg-primary-50 px-4 py-3">
                    <div className="text-left">
                      <p className="text-xs font-bold text-primary-700">Puntaje de pronunciación</p>
                      <p className="text-[11px] text-slate-500">“{pronScore.target}”</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-black ${pronScore.score >= 80 ? 'bg-emerald-500 text-white' : pronScore.score >= 50 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
                      {pronScore.score}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Button
              className="mt-3 w-full"
              variant={voiceDone ? 'outline' : 'secondary'}
              onClick={async () => {
                if (voiceDone) return;
                await recordSpeaking(21);
                setVoiceDone(true);
              }}
            >
              {voiceDone ? <><Check className="h-4 w-4" /> ¡Voz registrada!</> : 'He terminado de hablar'}
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
