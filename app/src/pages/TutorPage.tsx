import { useEffect, useRef, useState } from 'react';
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
  const { entitlements, user } = useAppStore();
  const [modes, setModes] = useState<TutorMode[]>([]);
  const [mode, setMode] = useState('conversation');
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number }>({ used: 0, limit: 0 });
  const [stuck, setStuck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const speech = useSpeechRecognition();

  const premium = entitlements?.plan === 'premium';

  useEffect(() => {
    (async () => {
      const m = await getTutorModes();
      setModes(m.modes);
    })().catch(() => {});
  }, []);

  useEffect(() => {
    if (!premium) return;
    (async () => {
      const [h, u] = await Promise.all([getTutorHistory(mode), getTutorUsage()]);
      setMessages(h.messages);
      setUsage({ used: u.used, limit: u.limit });
    })().catch((e) => setError((e as Error).message));
  }, [mode, premium]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (speech.transcript) setInput(speech.transcript);
  }, [speech.transcript]);

  if (!premium) {
    return (
      <div className="p-5">
        <h1 className="text-xl font-bold">Tutor IA</h1>
        <Card className="mt-4">
          <div className="flex flex-col items-center py-6 text-center">
            <Lock className="h-8 w-8 text-slate-300" />
            <p className="mt-3 font-bold">Tutor IA es Premium</p>
            <p className="mt-1 text-sm text-slate-500">
              Conversación, roleplays, correcciones y práctica de voz con un tutor que conoce tu nivel.
            </p>
            <Button className="mt-4" variant="secondary" onClick={() => (window.location.href = '/premium')}>
              PROBAR PREMIUM
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const send = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: value }]);
    try {
      const reply = stuck ? await sendTutorStuck(value) : await sendTutorMessage(mode, value);
      setMessages((m) => [...m, { role: 'assistant', content: reply.reply }]);
      setUsage((u) => ({ ...u, used: reply.used, limit: reply.limit }));
      trackAnalyticsEvent('ai_session_completed', { mode: stuck ? 'stuck' : mode }).catch(() => {});
      speak(reply.reply);
    } catch (e) {
      const msg = (e as Error).message;
      const limited = /429/.test(msg);
      setError(limited ? 'Alcanzaste tu límite diario de mensajes IA.' : 'El tutor no respondió. Intenta de nuevo.');
      setMessages((m) => m.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  const switchMode = async (id: string) => {
    setStuck(id === 'stuck');
    setMode(id === 'stuck' ? 'conversation' : id);
    setMessages([]);
    try {
      const [h, u] = await Promise.all([getTutorHistory(id === 'stuck' ? 'stuck' : id), getTutorUsage()]);
      setMessages(h.messages ?? []);
      setUsage({ used: u.used, limit: u.limit });
    } catch {
      setMessages([]);
    }
  };

  const remaining = Math.max(0, usage.limit - usage.used);

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col p-5 pb-0">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Bot className="h-6 w-6 text-primary-600" /> Tutor IA
        </h1>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${remaining > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {remaining}/{usage.limit} mensajes
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">Hola {user?.name}, conozco tu nivel y tus debilidades.</p>
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
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
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

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-2">
            {speech.supported && (
              <button
                onClick={() => (speech.listening ? speech.stop() : speech.start())}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  speech.listening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600'
                }`}
                aria-label="Grabar voz"
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={stuck ? 'Escribe con qué necesitas ayuda…' : 'Responde en inglés… (español si te atascas)'}
              className="h-11 flex-1 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-primary-500"
            />
            <Button className="h-11 shrink-0 px-4" onClick={() => send()} disabled={sending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {speech.listening && <p className="mt-1 text-[10px] text-slate-400">Escuchando… habla en inglés.</p>}
        </div>
      </Card>
    </div>
  );
}
