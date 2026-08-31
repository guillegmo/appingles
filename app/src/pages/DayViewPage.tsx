import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, Mic, Sparkles, Check, Loader2 } from 'lucide-react';
import { getDay, completeDay, submitExercise, recordSpeaking, trackAnalyticsEvent, scorePronunciation, addVocabularyItems } from '../services/api';
import { speak } from '../utils/speech';
import { isSpanish } from '../utils/language';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { SpeechSpeedControl } from '../components/SpeechSpeedControl';
import { LoadingScreen } from '../components/ui/Spinner';
import { QuestionCard } from '../components/QuestionCard';
import { VisualVocabularyCard } from '../components/VisualVocabularyCard';
import type { DayContent, ReviewExam } from '../types';

const STEP_LABELS: Record<string, string> = {
  learn: 'Aprender',
  listen: 'Escuchar',
  pronounce: 'Pronunciar',
  practice: 'Practicar',
  speak: 'Hablar',
  challenge: 'Reto',
  complete: 'Completado',
};

// Compara una respuesta escrita/dicha con la esperada (normalizada).
// Devuelve true si coincide razonablemente (web speech suele acortar).
function fuzzyMatches(target: string, spoken: string) {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[.,!?¡¿'’]/g, '').split(/\s+/).filter(Boolean);
  const t = norm(target);
  const sp = norm(spoken);
  if (!t.length || !sp.length) return false;
  const set = new Set(t);
  let hits = 0;
  for (const w of sp) if (set.has(w)) hits++;
  return hits / t.length >= 0.8;
}

export function DayViewPage() {
  const { day: dayParam } = useParams();
  const dayNumber = Number(dayParam);
  const navigate = useNavigate();
  const { entitlements, applyXp, applyDayComplete } = useAppStore();

  const [day, setDay] = useState<DayContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [error, setErr] = useState<string | null>(null);
  const [saidCorrect, setSaidCorrect] = useState<Set<string>>(new Set());
  const [pronScore, setPronScore] = useState<{ target: string; score: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const speech = useSpeechRecognition();
  const loadedDayRef = useRef<number | null>(null);

  useEffect(() => {
    getDay(dayNumber)
      .then((d) => {
        setDay(d);
        // En StrictMode (dev) el efecto corre dos veces y la segunda respuesta
        // puede llegar tarde: si el día ya se cargó, no reiniciamos el avance.
        if (loadedDayRef.current === dayNumber) return;
        loadedDayRef.current = dayNumber;
        setStepIdx(0);
        setCompletedSteps(d.completed ? (d.steps ?? []) : []);
        setSaidCorrect(new Set());
      })
      .catch((e) => setErr(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [dayNumber]);

  const steps = day?.steps ?? [];
  const currentStep = steps[stepIdx] ?? 'learn';
  const progressPct = useMemo(() => (steps.length ? Math.round((completedSteps.length / steps.length) * 100) : 0), [completedSteps, steps]);

  const markStep = (step: string) => {
    setCompletedSteps((prev) => ((prev ?? []).includes(step) ? prev ?? [] : [...(prev ?? []), step]));
  };

  const next = async () => {
    if (stepIdx < steps.length - 1) {
      setStepIdx(stepIdx + 1);
      return;
    }
    // Último paso -> completar día
    setBusy(true);
    try {
      const res = await completeDay(dayNumber);
      trackAnalyticsEvent('day_completed', { day: dayNumber }).catch(() => {});
      // Actualiza el store local (XP, racha, badges, día completado) sin las
      // 3 llamadas de refreshAll: Home ya refleja el estado nuevo al volver.
      applyDayComplete(res);
      navigate('/home');
    } catch (e) {
      setErr((e as any).response?.data?.error || (e as Error).message);
      setBusy(false);
    }
  };

  const handleExercise = async (exerciseId: string, correct: boolean) => {
    markStep('practice');
    setBusy(true);
    try {
      const res = await submitExercise({ day: dayNumber, exerciseId, type: 'mcq', answer: '', correct });
      applyXp(res.totalXp);
      // Banco de vocabulario IA: un fallo guarda las palabras del día.
      if (!correct && day?.vocabulary?.length) {
        addVocabularyItems(day.vocabulary.map((v) => ({ en: v.en, es: v.es }))).catch(() => {});
      }
      trackAnalyticsEvent('exercise_completed', { day: dayNumber, correct }).catch(() => {});
      setStepIdx(Math.min(stepIdx + 1, steps.length - 1));
    } catch (e) {
      setErr((e as any).response?.data?.error || (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleExerciseResult = async (exerciseId: string, type: string, correct: boolean) => {
    markStep('practice');
    setBusy(true);
    try {
      const res = await submitExercise({ day: dayNumber, exerciseId, type, answer: '', correct });
      applyXp(res.totalXp);
      // Banco de vocabulario IA: un fallo guarda las palabras del día.
      if (!correct && day?.vocabulary?.length) {
        addVocabularyItems(day.vocabulary.map((v) => ({ en: v.en, es: v.es }))).catch(() => {});
      }
      trackAnalyticsEvent('exercise_completed', { day: dayNumber, correct }).catch(() => {});
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSpeaking = async () => {
    markStep('speak');
    setBusy(true);
    try {
      const res = await recordSpeaking(dayNumber);
      applyXp(res.totalXp);
      trackAnalyticsEvent('speaking_completed', { day: dayNumber }).catch(() => {});
      setStepIdx(Math.min(stepIdx + 1, steps.length - 1));
    } catch (e) {
      setErr((e as any).response?.data?.error || (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Cuando llega una transcripción nueva, marca las frases dichas correctamente.
  useEffect(() => {
    if (!speech.transcript || !day) return;
    const spoken = speech.transcript;
    const phrases = day.phrases ?? [];
    setSaidCorrect((prev) => {
      const next = new Set(prev);
      phrases.slice(0, 3).forEach((p) => {
        if (!next.has(p.en) && fuzzyMatches(p.en, spoken)) next.add(p.en);
      });
      return next;
    });
    // Puntaje de pronunciación (Premium IA).
    if (entitlements?.canScorePronunciation) {
      const attempted = phrases.slice(0, 3).find((p) => fuzzyMatches(p.en, spoken)) ?? phrases.slice(0, 3)[0];
      if (attempted) {
        scorePronunciation({ transcript: spoken, target: attempted.en, day: dayNumber })
          .then((r) => setPronScore({ target: attempted.en, score: r.score }))
          .catch(() => {});
      }
    }
  }, [speech.transcript, day]);

  const speakPhrases = day?.phrases?.slice(0, 3) ?? [];
  const hasSpeakPhrases = speakPhrases.length > 0;
  const allSaid = hasSpeakPhrases && speakPhrases.every((p) => saidCorrect.has(p.en));
  const speakBlocked = hasSpeakPhrases && !allSaid;

  if (loading) return <LoadingScreen label="Cargando día…" />;
  if (error) {
    const isPremium = error === 'premium_required';
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate('/home')} className="mb-4">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <Card>
          <p className="font-bold text-rose-600">{isPremium ? 'Este contenido está en Premium IA' : 'Algo salió mal'}</p>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          {isPremium && (
            <Button className="mt-4 w-full" variant="secondary" onClick={() => navigate('/premium')}>
              VER PREMIUM IA
            </Button>
          )}
        </Card>
      </div>
    );
  }
  if (!day) return <div className="p-8 text-slate-500">Día no encontrado</div>;

  return (
    <div className="p-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/home')} aria-label="Volver">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <p className="station-label text-primary-600">Estación {day.day} de 21</p>
          <h1 className="text-xl font-bold tracking-tight">{day.title}</h1>
        </div>
      </div>

      <ProgressBar value={progressPct} className="mt-3" />

      <div className="mt-3 flex justify-center">
        <SpeechSpeedControl compact />
      </div>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {steps.map((s, i) => {
          const done = (completedSteps ?? []).includes(s) || i < stepIdx;
          const current = i === stepIdx;
          return (
            <div key={s} className="flex shrink-0 items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-bold ${
                  done
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : current
                      ? 'border-primary-600 bg-primary-600 text-white shadow-glow'
                      : 'border-slate-300 bg-white text-slate-400'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="num">{i + 1}</span>}
              </div>
              <span
                className={`whitespace-nowrap text-[11px] font-semibold ${
                  current ? 'text-primary-700' : done ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {STEP_LABELS[s]}
              </span>
              {i < steps.length - 1 && <span className="mx-1 h-px w-2 bg-slate-300" />}
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        {currentStep === 'learn' && (
          <Card>
            <h2 className="text-lg font-bold">🎯 Objetivo de hoy</h2>
            <p className="mt-2 text-slate-600">{day.goal}</p>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-semibold">Punto de gramática</p>
              <p className="text-slate-600">{day.grammarFocus}</p>
            </div>
            {day.lesson && (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="font-semibold">{day.lesson.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{day.lesson.rule}</p>
                </div>
                <div className="rounded-lg bg-primary-50 p-3">
                  <p className="text-xs font-bold uppercase text-primary-700">Ejemplos</p>
                  <ul className="mt-1.5 space-y-1">
                    {day.lesson.examples.map((ex, i) => (
                      <li key={i}>
                        <button onClick={() => speak(ex)} className="flex w-full items-center justify-between text-left text-sm">
                          <span className="font-semibold text-primary-900">{ex}</span>
                          <Volume2 className="h-4 w-4 text-primary-500" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                {day.lesson.commonMistakes?.length ? (
                  <div className="rounded-lg bg-rose-50 p-3">
                    <p className="text-xs font-bold uppercase text-rose-700">Errores comunes</p>
                    <ul className="mt-1.5 space-y-1 text-sm text-rose-900">
                      {day.lesson.commonMistakes.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
            {day.pronunciationTip && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                🔊 <span className="font-semibold">Pronunciación:</span> {day.pronunciationTip}
              </div>
            )}
            <div className="mt-4">
              <p className="mb-2 font-semibold">Vocabulario clave</p>
              <div className="space-y-2">
                {(day.vocabulary ?? []).map((v, i) =>
                  v.image ? (
                    <VisualVocabularyCard key={i} item={v} />
                  ) : (
                    <button
                      key={i}
                      onClick={() => speak(v.en)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span>
                        <span className="font-semibold">{v.en}</span>
                        <span className="ml-2 text-slate-500">{v.es}</span>
                      </span>
                      <Volume2 className="h-4 w-4 text-primary-500" />
                    </button>
                  ),
                )}
              </div>
            </div>
            <Button className="mt-5 w-full" size="lg" onClick={() => { markStep('learn'); setStepIdx(stepIdx + 1); }}>
              Continuar
            </Button>
          </Card>
        )}

        {currentStep === 'listen' && (
          <Card>
            <h2 className="text-lg font-bold">👂 Escuchar</h2>
            <p className="mt-2 text-sm text-slate-500">Toca una frase para oírla.</p>
            <div className="mt-3 space-y-2">
              {(day.phrases ?? []).map((p, i) => (
                <button
                  key={i}
                  onClick={() => speak(p.en)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-left hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold">{p.en}</p>
                    <p className="text-xs text-slate-500">{p.es}</p>
                  </div>
                  <Volume2 className="h-5 w-5 text-primary-500" />
                </button>
              ))}
            </div>
            <Button className="mt-5 w-full" size="lg" onClick={() => { markStep('listen'); setStepIdx(stepIdx + 1); }}>
              Continuar
            </Button>
          </Card>
        )}

        {currentStep === 'pronounce' && (
          <Card>
            <h2 className="text-lg font-bold">🗣 Pronunciar</h2>
            <p className="mt-2 text-sm text-slate-500">
              Repite después del audio para practicar tu pronunciación.
            </p>
            <div className="mt-4 space-y-2">
              {(day.phrases ?? []).slice(0, 3).map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold">{p.en}</p>
                    <p className="text-xs text-slate-500">{p.es}</p>
                  </div>
                  <button onClick={() => speak(p.en)} className="rounded-full bg-primary-600 p-2 text-white" aria-label={`Escuchar ${p.en}`}>
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">Toca el altavoz y repite la frase en voz alta.</p>
            <Button className="mt-4 w-full" size="lg" onClick={() => { markStep('pronounce'); setStepIdx(stepIdx + 1); }}>
              Continuar
            </Button>
          </Card>
        )}

        {currentStep === 'practice' && (
          day.exercises?.length ? (
            <ExerciseCard
              day={day}
              onAnswer={handleExerciseResult}
              onNext={() => { markStep('practice'); setStepIdx(stepIdx + 1); }}
              busy={busy}
            />
          ) : (
            <PracticeCard day={day} onAnswer={handleExercise} onNext={() => { markStep('practice'); setStepIdx(stepIdx + 1); }} busy={busy} />
          )
        )}

        {currentStep === 'speak' && (
          <Card>
            <h2 className="text-lg font-bold">🎤 Hablar</h2>
            <p className="mt-2 text-sm text-slate-600">{day.speak}</p>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase text-slate-400">Tarea</p>
              {hasSpeakPhrases ? (
                <p className="text-sm text-slate-600">
                  1️⃣ Escucha cada frase. 2️⃣ Pulsa el botón <span className="font-semibold">rojo</span> y repítela en voz alta. 3️⃣ Cuando la digas bien, verás un ✓.
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  Toca el micrófono y habla en inglés sin leer. Intenta mantenerlo un minuto.
                </p>
              )}
            </div>

            {speakPhrases.map((p, i) => {
              const done = saidCorrect.has(p.en);
              return (
                <div
                  key={i}
                  className={`mt-2 rounded-xl border p-3 transition-colors ${done ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{p.en}</p>
                      <p className="text-xs text-slate-500">{p.es}</p>
                    </div>
                    {done ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white">
                        ✓ ¡Muy bien!
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                        Pendiente
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => speak(p.en)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    <Volume2 className="h-3.5 w-3.5" /> Escuchar modelo
                  </button>
                </div>
              );
            })}

            {allSaid && (
              <div className="mt-3 rounded-xl bg-emerald-100 px-4 py-3 text-center">
                <p className="text-sm font-bold text-emerald-700">🎉 ¡Perfecto! Has dicho todas las frases correctamente.</p>
                <p className="mt-0.5 text-xs text-emerald-600">Gran trabajo, {day && 'sigue así'}</p>
              </div>
            )}

            <div className="mt-6 flex flex-col items-center">
              {!speech.supported ? (
                <p className="text-sm text-slate-400">Tu navegador no soporta voz. Marca completado para continuar.</p>
              ) : (
                <>
<button
            onClick={speech.listening ? speech.stop : speech.start}
            className={`flex h-20 w-20 items-center justify-center rounded-full transition-colors ${
              speech.listening ? 'bg-orange-500 animate-pulse' : 'bg-primary-600 shadow-glow'
            } text-white`}
            aria-label={speech.listening ? 'Detener micrófono' : 'Pulsar para hablar'}
          >
                    <Mic className="h-8 w-8" />
                  </button>
                  <p className="mt-2 text-xs text-slate-500">
                    {speech.listening ? 'Escuchando… habla en voz alta' : hasSpeakPhrases ? 'Toca el micrófono y di la frase' : 'Toca el micrófono y habla libremente'}
                  </p>
                  {speech.transcript && (
                    <>
                      <div className="mt-4 w-full rounded-lg bg-slate-50 p-3 text-center text-sm font-medium">
                        “{speech.transcript}”
                      </div>
                      {isSpanish(speech.transcript) && (
                        <p className="mt-3 w-full rounded-xl bg-amber-100 px-4 py-3 text-center text-sm font-semibold text-amber-800">
                          🗣️ Lo dijiste en español. ¡Inténtalo en inglés! Escucha el modelo arriba y repite la frase.
                        </p>
                      )}
                      {pronScore && entitlements?.canScorePronunciation && (
                        <div className="mt-3 flex w-full items-center justify-between rounded-xl bg-primary-50 px-4 py-3">
                          <div className="text-left">
                            <p className="text-xs font-bold text-primary-700">Puntaje de pronunciación</p>
                            <p className="text-[11px] text-slate-500">“{pronScore.target}”</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-sm font-black ${pronScore.score >= 80 ? 'bg-emerald-500 text-white' : pronScore.score >= 50 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {pronScore.score}
                          </span>
                        </div>
                      )}
                      {!entitlements?.canScorePronunciation && (
                        <button
                          onClick={() => navigate('/premium')}
                          className="mt-3 w-full rounded-xl border border-primary-200 bg-white px-4 py-2 text-center text-xs font-semibold text-primary-700"
                        >
                          ✨ Con Premium IA recibes puntaje de pronunciación en cada frase
                        </button>
                      )}
                    </>
                  )}
                  {!speech.transcript && !speech.listening && (
                    <p className="mt-3 text-xs text-slate-400">No grabamos audio: solo reconocemos tu voz para que practiques sin miedo.</p>
                  )}
                </>
              )}
            </div>
            <Button
              className="mt-5 w-full"
              size="lg"
              onClick={handleSpeaking}
              disabled={busy || (speech.supported ? speech.listening || speakBlocked : false)}
            >
              {busy ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
              ) : speech.supported && speakBlocked ? 'Di todas las frases para continuar' : 'Completar práctica de habla'}
            </Button>
          </Card>
        )}

        {currentStep === 'challenge' && (
          day.review ? (
            <ExamCard
              exam={day.review}
              onAnswer={handleExerciseResult}
              onDone={() => { markStep('challenge'); setStepIdx(stepIdx + 1); }}
              busy={busy}
            />
          ) : (
            <Card>
              <h2 className="text-lg font-bold">⚡ Reto de la vida real</h2>
              <p className="mt-2 text-slate-600">{day.challenge}</p>
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                💡 Reto real: hazlo con tu voz o con un compañero (o el tutor IA cuando esté disponible).
              </div>
              <Button className="mt-5 w-full" size="lg" onClick={() => { markStep('challenge'); setStepIdx(stepIdx + 1); }}>
                Continuar
              </Button>
            </Card>
          )
        )}

        {currentStep === 'complete' && (
          <Card className="text-center">
            <Sparkles className="mx-auto h-10 w-10 text-primary-600" />
            <h2 className="mt-2 text-2xl font-bold tracking-tight">¡Día {day.day} completado!</h2>
            <p className="num mt-1 text-sm text-amber-600">+{day.xpReward} XP</p>
            <Button className="mt-5 w-full" size="lg" onClick={next} disabled={busy}>
              {busy ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
              ) : day.day === 21 ? 'Ver mi próximo plan' : 'Continuar al siguiente día'}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

function PracticeCard({
  day,
  onAnswer,
  onNext,
  busy,
}: {
  day: DayContent;
  onAnswer: (id: string, correct: boolean) => void;
  onNext: () => void;
  busy?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  // Quiz simple: traduce una palabra de vocabulario a su significado.
  const vocab = day.vocabulary ?? [];
  const q = vocab[0];
  const options = useMemo(() => {
    if (!vocab.length) return [];
    const correct = vocab[0].es;
    const others = vocab.slice(1).map((v) => v.es).slice(0, 3);
    return [...new Set([correct, ...others])].sort();
  }, [vocab]);

  const check = (opt: string) => {
    setSelected(opt);
    setAnswered(true);
  };

  if (!vocab.length) {    return (
      <Card>
        <h2 className="text-lg font-bold">✏️ Practicar</h2>
        <Button className="mt-4 w-full" size="lg" onClick={onNext}>
          Continuar
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-bold">✏️ Practicar</h2>
      <p className="mt-2 text-sm text-slate-500">¿Qué significa “{q?.en}”?</p>
      <div className="mt-4 space-y-2">
        {options.map((opt) => {
          const isCorrect = answered && opt === q.es;
          const isWrong = answered && opt === selected && opt !== q.es;
          return (
            <button
              key={opt}
              onClick={() => !answered && check(opt)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                isCorrect ? 'border-emerald-500 bg-emerald-50 font-semibold' : isWrong ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {answered ? (
        <Button className="mt-5 w-full" size="lg" onClick={() => { onAnswer('quiz-1', selected === q.es); }} disabled={busy}>
          {busy ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</>
          ) : selected === q.es ? '¡Correcto! Continuar' : 'Continuar'}
        </Button>
      ) : (
        <Button className="mt-5 w-full" size="lg" disabled>
          Comprobar respuesta
        </Button>
      )}
    </Card>
  );
}

// Paso Practicar con 3-4 ejercicios variados por día.
function ExerciseCard({
  day,
  onAnswer,
  onNext,
  busy,
}: {
  day: DayContent;
  onAnswer: (id: string, type: string, correct: boolean) => void;
  onNext: () => void;
  busy?: boolean;
}) {
  const exercises = day.exercises ?? [];
  const [idx, setIdx] = useState(0);

  const ex = exercises[idx];
  if (!ex) {
    return (
      <Card>
        <h2 className="text-lg font-bold">✏️ Practicar</h2>
        <Button className="mt-4 w-full" size="lg" onClick={onNext}>
          Continuar
        </Button>
      </Card>
    );
  }

  const isLast = idx + 1 >= exercises.length;
  return (
    <QuestionCard
      key={idx}
      q={ex}
      index={idx + 1}
      total={exercises.length}
      onCheck={(correct) => onAnswer(`ex-${idx + 1}`, ex.type, correct)}
      onContinue={() => {
        if (isLast) onNext();
        else setIdx(idx + 1);
      }}
      busy={busy}
      continueLabel={isLast ? '¡Terminado! Continuar' : 'Siguiente ejercicio'}
    />
  );
}

// Examen de repaso (días 7, 14, 21): preguntas + resultado final.
function ExamCard({
  exam,
  onAnswer,
  onDone,
  busy,
}: {
  exam: ReviewExam;
  onAnswer: (id: string, type: string, correct: boolean) => void;
  onDone: () => void;
  busy?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);

  const q = exam.questions[idx];
  if (!q) {
    const score = Math.round((results.filter(Boolean).length / Math.max(1, exam.questions.length)) * 100);
    const passed = score >= exam.passScore;
    return (
      <Card className="text-center">
        <h2 className="text-lg font-bold">📝 {exam.title}</h2>
        <p className={`num mt-3 text-4xl font-black ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>{score}%</p>
        <p className="mt-1 text-sm text-slate-500">
          {passed ? '¡Aprobado! Repaso bien hecho.' : `Repasa esta semana y vuelve a intentarlo (mínimo ${exam.passScore}%).`}
        </p>
        <Button className="mt-5 w-full" size="lg" onClick={onDone} disabled={busy}>
          Continuar
        </Button>
      </Card>
    );
  }

  const isLast = idx + 1 >= exam.questions.length;
  return (
    <QuestionCard
      key={idx}
      q={q}
      index={idx + 1}
      total={exam.questions.length}
      onCheck={(correct) => {
        setResults((p) => [...p, correct]);
        onAnswer(`exam-${idx + 1}`, q.type, correct);
      }}
      onContinue={() => setIdx(idx + 1)}
      busy={busy}
      continueLabel={isLast ? 'Ver resultado' : 'Siguiente pregunta'}
    />
  );
}
