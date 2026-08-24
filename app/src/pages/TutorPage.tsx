import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Lock, Mic, Send, Volume2, Loader2, HelpCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { speak } from '../utils/speech';
import { getTutorModes, getTutorHistory, sendTutorMessage, sendTutorStuck, getTutorUsage, trackAnalyticsEvent } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SpeechSpeedControl } from '../components/SpeechSpeedControl';
import type { TutorMode, TutorMessage } from '../types';

export function TutorPage() {
  const navigate = useNavigate();
  const { entitlements, user } = useAppStore();
  const premium = entitlements?.plan === 'premium';
  const [modes, setModes] = useState<TutorMode[]>([]);
  const [mode, setMode] = useState('conversation');
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number }>({ used: 0, limit: 0 });
  const [stuck, setStuck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [recognitionLang, setRecognitionLang] = useState<'es-CO' | 'en-US'>('es-CO');
  const bottomRef = useRef<HTMLDivElement>(null);

  const voiceModeRef = useRef(false);
  const sendingRef = useRef(false);
  const lastSentRef = useRef('');
  const speechSeqRef = useRef(0);
  const onFinalHandlerRef = useRef<(text: string) => void>(() => {});

  const speech = useSpeechRecognition({
    lang: recognitionLang,
    onFinal: (t) => onFinalHandlerRef.current(t),
  });

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  useEffect(() => {
    const controller = new AbortController();
    getTutorModes(controller.signal)
      .then((m) => setModes(m.modes))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getTutorHistory(mode, controller.signal), getTutorUsage(controller.signal)])
      .then(([h, u]) => {
        setMessages(h.messages);
        setUsage({ used: u.used, limit: u.limit });
      })
      .catch((e) => {
        if ((e as { code?: string })?.code === 'ERR_CANCELED') return;
        setError((e as Error).message);
      });
    return () => controller.abort();
  }, [mode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (speech.transcript && !voiceMode) setInput(speech.transcript);
  }, [speech.transcript, voiceMode]);

  // Parar voz y síntesis al desmontar.
  useEffect(() => {
    return () => {
      speech.stop();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || sendingRef.current) return;
    if (!premium && remaining === 0) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: value }]);
    try {
      const reply = stuck ? await sendTutorStuck(value) : await sendTutorMessage(mode, value);
      setMessages((m) => [...m, { role: 'assistant', content: reply.reply }]);
      setUsage((u) => ({ ...u, used: reply.used, limit: reply.limit }));
      trackAnalyticsEvent('ai_session_completed', { mode: stuck ? 'stuck' : mode }).catch(() => {});
      const seq = ++speechSeqRef.current;
      speak(reply.reply, {
        onEnd: () => {
          // Conversación continua: al terminar de leer, vuelve a escuchar.
          // Solo si es la locución más reciente (las canceladas no reinician).
          if (speechSeqRef.current === seq && voiceModeRef.current) speech.start();
        },
      });
    } catch (e) {
      const msg = (e as Error).message;
      const limited = /429/.test(msg);
      setError(limited ? 'Alcanzaste tu límite diario de mensajes IA.' : 'El tutor no respondió. Intenta de nuevo.');
      setMessages((m) => m.slice(0, -1));
      if (voiceModeRef.current) {
        if (limited) {
          setVoiceMode(false);
          voiceModeRef.current = false;
        } else {
          speech.start();
        }
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  // Turno hablado: auto-envía lo que el usuario dijo sin pulsar Enviar.
  const handleVoiceTurn = (finalText: string) => {
    const value = finalText.trim();
    if (!value || !voiceModeRef.current) return;
    if (lastSentRef.current === value) return;
    lastSentRef.current = value;
    send(value);
  };
  onFinalHandlerRef.current = handleVoiceTurn;

  const toggleVoice = () => {
    if (voiceModeRef.current) {
      speech.stop();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setVoiceMode(false);
      voiceModeRef.current = false;
      lastSentRef.current = '';
    } else {
      setVoiceMode(true);
      voiceModeRef.current = true;
      lastSentRef.current = '';
      speech.start();
    }
  };

  const toggleLang = () => {
    const next = recognitionLang === 'es-CO' ? 'en-US' : 'es-CO';
    setRecognitionLang(next);
    if (voiceModeRef.current) {
      speech.stop();
      speech.start();
    }
  };

  const switchMode = async (id: string) => {
    setStuck(id === 'stuck');
    setMode(id === 'stuck' ? 'conversation' : id);
    setMessages([]);
    if (voiceModeRef.current) {
      speech.stop();
      setVoiceMode(false);
      voiceModeRef.current = false;
      lastSentRef.current = '';
    }
    try {
      // El historial por modo está cacheado (TTL 15s): cambiar de modo y
      // volver no repite la petición; el envío de un mensaje invalida la caché.
      const [h, u] = await Promise.all([getTutorHistory(id === 'stuck' ? 'stuck' : id), getTutorUsage()]);
      setMessages(h.messages ?? []);
      setUsage({ used: u.used, limit: u.limit });
    } catch {
      setMessages([]);
    }
  };

  const remaining = Math.max(0, usage.limit - usage.used);

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col p-5 pb-0">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Bot className="h-6 w-6 text-primary-600" /> Tutor IA
        </h1>
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${premium ? 'bg-emerald-100 text-emerald-700' : remaining > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {!premium && <Lock className="h-3 w-3" />}
          {premium ? 'Ilimitado' : `${remaining}/${usage.limit} mensajes hoy`}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">Hola {user?.name}, conozco tu nivel y tus debilidades.</p>
      {!premium && (
        <button
          onClick={() => navigate('/premium')}
          className="mt-2 w-full rounded-xl bg-primary-600 px-3 py-2 text-left text-xs font-semibold text-white"
        >
          Tienes {remaining} mensajes IA gratis hoy. Desbloquea conversaciones ilimitadas con Premium IA →
        </button>
      )}
      <div className="mt-2 flex justify-center">
        <SpeechSpeedControl compact />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => switchMode(m.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              !stuck && mode === m.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {m.label}
          </button>
        ))}
        <button
          onClick={() => switchMode('stuck')}
          className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
            stuck ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" /> Estoy Atascado
        </button>
      </div>

      <Card className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">
              {stuck
                ? '¿Qué te tiene atascado? Cuéntamelo y te lo explico paso a paso.'
                : modes.find((m) => m.id === mode)?.description ?? 'Empieza a practicar.'}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.role === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.role === 'assistant' && (
                  <button onClick={() => speak(m.content)} className="mt-1.5 flex items-center gap-1 text-xs text-primary-600" aria-label="Escuchar">
                    <Volume2 className="h-3.5 w-3.5" /> escuchar
                  </button>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> escribiendo…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p className="px-4 pb-1 text-xs text-rose-600">{error}</p>}

        <div className="shrink-0 border-t border-slate-100 p-3">
          {!premium && remaining === 0 ? (
            <div className="flex flex-col items-center rounded-xl bg-rose-50 px-4 py-5 text-center">
              <Lock className="h-6 w-6 text-rose-400" />
              <p className="mt-2 text-sm font-bold text-rose-700">Se acabaron tus mensajes gratis hoy</p>
              <p className="mt-1 text-xs text-slate-500">
                Con Premium IA conversas sin límite, con voz y con corrección al momento.
              </p>
              <Button className="mt-3 w-full" size="lg" onClick={() => navigate('/premium')}>
                Desbloquear Premium IA
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {speech.supported && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={toggleLang}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold transition-colors ${
                      recognitionLang === 'es-CO'
                        ? 'border-primary-300 bg-primary-50 text-primary-700'
                        : 'border-slate-300 bg-white text-slate-500'
                    }`}
                    aria-label="Cambiar idioma de la voz (español colombiano / inglés)"
                    title={recognitionLang === 'es-CO' ? 'Escucha español colombiano' : 'Escucha inglés'}
                  >
                    {recognitionLang === 'es-CO' ? 'ES' : 'EN'}
                  </button>
                  <button
                    onClick={toggleVoice}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      voiceMode
                        ? speech.listening
                          ? 'bg-orange-500 text-white animate-pulse'
                          : 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                    aria-label={voiceMode ? 'Detener conversación por voz' : 'Iniciar conversación por voz'}
                    title={voiceMode ? 'Detener conversación por voz' : 'Iniciar conversación por voz'}
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                </div>
              )}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={stuck ? 'Escribe con qué necesitas ayuda…' : 'Responde en inglés… (español si te atascas)'}
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-primary-500"
              />
              <Button className="h-11 shrink-0 px-4" onClick={() => send()} disabled={sending || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
          {voiceMode && (
            <p className="mt-1 text-[10px] text-slate-400">
              {speech.listening
                ? `Escuchando… habla (${recognitionLang === 'es-CO' ? 'español' : 'inglés'}). Toca el mic para terminar.`
                : 'El tutor está respondiendo…'}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}