import { useEffect, useState } from 'react';
import { Volume2, Loader2 } from 'lucide-react';
import { speak } from '../utils/speech';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import type { DayExercise } from '../types';

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

// Renderiza una pregunta (mcq | gapfill | translate | order | listening |
// matching | dialogue | errorfix | listen-type | listen-order) con su input y
// botón "Comprobar". Lo usan el flujo del día y la Práctica rápida.
export function QuestionCard({
  q,
  index,
  total,
  onCheck,
  onContinue,
  busy,
  continueLabel,
  title = '✏️ Practicar',
}: {
  q: DayExercise;
  index: number;
  total: number;
  onCheck: (correct: boolean) => void;
  onContinue: () => void;
  busy?: boolean;
  continueLabel?: string;
  title?: string;
}) {
  const [answered, setAnswered] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);
  const [orderSel, setOrderSel] = useState<number[]>([]);
  const [input, setInput] = useState('');
  const [ok, setOk] = useState(false);
  const [matchSel, setMatchSel] = useState<(number | null)[]>([]);
  const [listenPlayed, setListenPlayed] = useState(false);

  useEffect(() => {
    if (!answered) return;
    const t = setTimeout(onContinue, 900);
    return () => clearTimeout(t);
  }, [answered]);

  const check = () => {
    if (answered) return;
    let correct = false;
    if (q.type === 'mcq' || q.type === 'gapfill' || q.type === 'listening' || q.type === 'dialogue' || q.type === 'errorfix') correct = chosen === q.answer;
    else if (q.type === 'translate' || q.type === 'listen-type') correct = fuzzyMatches(String(q.answer), input.trim());
    else if (q.type === 'order' || q.type === 'listen-order') {
      const answer = q.answer as number[];
      correct = orderSel.length === answer.length && answer.every((v, i) => orderSel[i] === v);
    } else if (q.type === 'matching' && q.pairs) {
      correct = matchSel.every((v, i) => v === i);
    }
    setOk(correct);
    setAnswered(true);
    onCheck(correct);
  };

  const ready = answered
    ? false
    : q.type === 'order'
      ? orderSel.length < (q.words?.length ?? 0)
      : q.type === 'listen-order'
        ? !listenPlayed || orderSel.length < (q.words?.length ?? 0)
        : q.type === 'matching'
          ? matchSel.some(v => v === null) || matchSel.length === 0
          : q.type === 'translate'
            ? !input.trim()
            : q.type === 'listen-type'
              ? !listenPlayed || !input.trim()
              : q.type === 'listening'
                ? !listenPlayed || chosen === null
                : chosen === null;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {index} / {total}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700">{q.prompt}</p>

      {(q.type === 'listen-type' || q.type === 'listen-order') && (
        <button
          onClick={() => { speak(q.audio ?? (q.words ? q.words.join(' ') : String(q.answer))); setListenPlayed(true); }}
          disabled={answered || busy}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary-100 px-5 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-200"
        >
          <Volume2 className="h-5 w-5" /> Escuchar
        </button>
      )}

      {(q.type === 'order' || q.type === 'listen-order') && (
        <div className="mt-3">
          <div className="flex min-h-[52px] flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2">
            {orderSel.length === 0 && <span className="text-xs text-slate-400">Toca las palabras en orden…</span>}
            {orderSel.map((wi, i) => (
              <span key={i} className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold shadow-sm">
                {q.words?.[wi]}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {q.words?.map((w, wi) => {
              const used = orderSel.includes(wi);
              return (
                <button
                  key={wi}
                  disabled={used || answered}
                  onClick={() => setOrderSel((p) => [...p, wi])}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    used ? 'border-slate-200 bg-slate-100 text-slate-400' : 'border-primary-200 bg-white text-primary-700 hover:bg-primary-50'
                  }`}
                >
                  {w}
                </button>
              );
            })}
          </div>
          {orderSel.length > 0 && !answered && (
            <button className="mt-2 text-xs font-semibold text-rose-500" onClick={() => setOrderSel((p) => p.slice(0, -1))}>
              Deshacer
            </button>
          )}
        </div>
      )}

      {(q.type === 'mcq' || q.type === 'gapfill') && (
        <div className="mt-4 space-y-2">
          {q.options?.map((opt, i) => {
            const isCorrect = answered && i === q.answer;
            const isWrong = answered && i === chosen && i !== q.answer;
            return (
              <button
                key={i}
                disabled={answered || busy}
                onClick={() => setChosen(i)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  isCorrect ? 'border-emerald-500 bg-emerald-50 font-semibold' : isWrong ? 'border-rose-500 bg-rose-50' : chosen === i ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'translate' && (
        <div className="mt-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={answered || busy}
            onKeyDown={(e) => { if (e.key === 'Enter') check(); }}
            placeholder="Escribe tu respuesta en inglés…"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none"
          />
          <button
            onClick={() => speak(String(q.answer))}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          >
            <Volume2 className="h-3.5 w-3.5" /> Oír respuesta
          </button>
        </div>
      )}

      {q.type === 'listen-type' && (
        <div className="mt-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={answered || busy}
            onKeyDown={(e) => { if (e.key === 'Enter') check(); }}
            placeholder="Escribe lo que escuchas…"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary-400 focus:outline-none"
          />
        </div>
      )}

      {q.type === 'listening' && (
        <div className="mt-4">
          <button
            onClick={() => { speak(q.audio ?? String(q.answer)); setListenPlayed(true); }}
            disabled={answered || busy}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-100 px-5 py-3 text-sm font-semibold text-primary-700 hover:bg-primary-200"
          >
            <Volume2 className="h-5 w-5" /> Escuchar
          </button>
          {listenPlayed && (
            <div className="mt-3 space-y-2">
              {q.options?.map((opt, i) => {
                const isCorrect = answered && i === q.answer;
                const isWrong = answered && i === chosen && i !== q.answer;
                return (
                  <button
                    key={i}
                    disabled={answered || busy}
                    onClick={() => setChosen(i)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      isCorrect ? 'border-emerald-500 bg-emerald-50 font-semibold' : isWrong ? 'border-rose-500 bg-rose-50' : chosen === i ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {q.type === 'matching' && q.pairs && (
        <div className="mt-4 space-y-3">
          {(() => {
            if (matchSel.length === 0) {
              const shuffled = q.pairs!.map((_p, i) => i).sort(() => Math.random() - 0.5);
              setMatchSel(shuffled.map(() => null as number | null));
            }
            return q.pairs!.map((pair, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="min-w-[120px] rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold">{pair.en}</span>
                <select
                  disabled={answered || busy}
                  value={matchSel[i] !== null ? matchSel[i]! : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setMatchSel(prev => { const n = [...prev]; n[i] = val; return n; });
                  }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                    answered ? (matchSel[i] === i ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50') : 'border-slate-200'
                  }`}
                >
                  <option value="">Selecciona…</option>
                  {q.pairs!.map((p, pi) => (
                    <option key={pi} value={pi}>{p.es}</option>
                  ))}
                </select>
              </div>
            ));
          })()}
        </div>
      )}

      {q.type === 'dialogue' && (
        <div className="mt-4">
          {q.context && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {q.context}
            </div>
          )}
          <div className="space-y-2">
            {q.options?.map((opt, i) => {
              const isCorrect = answered && i === q.answer;
              const isWrong = answered && i === chosen && i !== q.answer;
              return (
                <button
                  key={i}
                  disabled={answered || busy}
                  onClick={() => setChosen(i)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    isCorrect ? 'border-emerald-500 bg-emerald-50 font-semibold' : isWrong ? 'border-rose-500 bg-rose-50' : chosen === i ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {q.type === 'errorfix' && (
        <div className="mt-4">
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <span className="text-xs font-semibold uppercase text-rose-500">Error encontrado:</span>
            <p className="mt-1 text-sm font-medium text-rose-700 line-through">{q.context ?? q.prompt}</p>
          </div>
          <p className="mb-2 text-xs font-semibold text-slate-500">¿Cuál es la forma correcta?</p>
          <div className="space-y-2">
            {q.options?.map((opt, i) => {
              const isCorrect = answered && i === q.answer;
              const isWrong = answered && i === chosen && i !== q.answer;
              return (
                <button
                  key={i}
                  disabled={answered || busy}
                  onClick={() => setChosen(i)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    isCorrect ? 'border-emerald-500 bg-emerald-50 font-semibold' : isWrong ? 'border-rose-500 bg-rose-50' : chosen === i ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {answered && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-bold ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {ok ? '✓ ¡Correcto!' : q.type === 'matching' ? '✗ Algunas parejas no coinciden.' : `✗ No exacto. Respuesta: ${String(q.answer)}`}
        </div>
      )}

      {answered ? (
        <Button className="mt-5 w-full" size="lg" onClick={onContinue} disabled={busy}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : continueLabel ?? 'Siguiente'}
        </Button>
      ) : (
        <Button className="mt-5 w-full" size="lg" disabled={ready} onClick={check}>
          Comprobar respuesta
        </Button>
      )}
    </Card>
  );
}