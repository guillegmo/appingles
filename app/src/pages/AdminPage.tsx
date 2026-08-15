import { useEffect, useState } from 'react';
import { Plus, ListFilter, Rocket, Loader2 } from 'lucide-react';
import { generateContentDraft, listContentDrafts, publishContentDraft } from '../services/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { AdminDraftSummary } from '../types';

const SKILLS = ['speaking', 'listening', 'vocabulary', 'grammar', 'conversation'];
const SITUATIONS = ['travel', 'work', 'social', 'shopping', 'restaurant', 'phone', 'interviews'];

export function AdminPage() {
  const [tab, setTab] = useState<'generate' | 'drafts'>('generate');
  const [skill, setSkill] = useState('conversation');
  const [situation, setSituation] = useState('social');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [items, setItems] = useState<AdminDraftSummary[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async (status?: string) => {
    try {
      const res = await listContentDrafts(status);
      setItems(res.items);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  useEffect(() => {
    if (tab === 'drafts') load();
  }, [tab]);

  const handleGenerate = async () => {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await generateContentDraft({ skill, situation, topic: topic.trim() });
      setMsg(`Draft creado: ${res.lesson.title} (${res.lesson.mock ? 'mock dev' : 'Groq'}). Revisa y publica.`);
      setTopic('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (id: string) => {
    setErr(null);
    try {
      await publishContentDraft(id);
      setMsg('Lección publicada. Ya aparece en Continuous Learning.');
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold">Admin · Contenido</h1>
      <p className="text-sm text-slate-500">Generación IA con flujo draft → publicado.</p>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setTab('generate')}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
            tab === 'generate' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <Plus className="h-3.5 w-3.5" /> Generar
        </button>
        <button
          onClick={() => setTab('drafts')}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${
            tab === 'drafts' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <ListFilter className="h-3.5 w-3.5" /> Borradores ({items.length})
        </button>
      </div>

      {msg && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{msg}</p>}
      {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}

      {tab === 'generate' && (
        <Card className="mt-4">
          <p className="text-sm font-semibold">Nueva lección</p>
          <div className="mt-3 space-y-3">
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Skill</p>
              <div className="flex flex-wrap gap-1.5">
                {SKILLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSkill(s)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      skill === s ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-500">Situation</p>
              <div className="flex flex-wrap gap-1.5">
                {SITUATIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSituation(s)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                      situation === s ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic, p.ej. 'Ordering coffee'"
              className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-primary-500"
            />
            <Button className="w-full" size="lg" onClick={handleGenerate} disabled={generating || !topic.trim()}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Generar borrador
            </Button>
          </div>
        </Card>
      )}

      {tab === 'drafts' && (
        <div className="mt-4 space-y-2">
          {items.map((d) => (
            <Card key={d.id} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold">{d.title}</p>
                <p className="text-xs capitalize text-slate-500">
                  {d.skill} · {d.situation}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${d.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {d.status}
                  </span>
                </p>
              </div>
              {d.status === 'draft' && (
                <Button size="sm" onClick={() => handlePublish(d.id)}>
                  Publicar
                </Button>
              )}
            </Card>
          ))}
          {items.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Sin drafts. Genera uno.</p>}
        </div>
      )}
    </div>
  );
}
