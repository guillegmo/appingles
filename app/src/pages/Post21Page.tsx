import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Headphones, MessageCircle, PenLine, MessageSquare, Sparkles, Loader2, ChevronRight } from 'lucide-react';
import { getPost21, generateLesson } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { Post21Index, Post21LessonSummary } from '../types';

const SKILL_LABELS: Record<string, string> = {
  speaking: 'Hablar',
  listening: 'Escuchar',
  vocabulary: 'Vocabulario',
  grammar: 'Gramática',
  conversation: 'Conversación',
};

const SKILL_ICONS: Record<string, typeof BookOpen> = {
  speaking: MessageCircle,
  listening: Headphones,
  vocabulary: BookOpen,
  grammar: PenLine,
  conversation: MessageSquare,
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

export function Post21Page() {
  const navigate = useNavigate();
  const { entitlements } = useAppStore();
  const [index, setIndex] = useState<Post21Index | null>(null);
  const [skill, setSkill] = useState<string>('all');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const reload = async (s = skill) => {
    try {
      setIndex(await getPost21(s === 'all' ? undefined : s));
    } catch {
      setIndex(null);
    }
  };

  useEffect(() => {
    reload(skill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill]);

  const handleGenerate = async () => {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setGenError(null);
    try {
      const { lesson } = await generateLesson({
        skill: skill === 'all' ? 'conversation' : skill,
        situation: 'social',
        topic: topic.trim(),
      });
      await reload(skill);
      navigate(`/practice/${lesson.id}`);
    } catch (e) {
      setGenError((e as Error).message || 'No se pudo generar la lección.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold">Aprendizaje continuo</h1>
      <p className="text-sm text-slate-500">Contenido post-21 por habilidad y situación.</p>

      {entitlements?.canGenerateLessons ? (
        <Card className="mt-3 border-primary-200">
          <p className="flex items-center gap-1.5 text-sm font-bold text-primary-700">
            <Sparkles className="h-4 w-4" /> Genera una lección con IA
          </p>
          <p className="mt-1 text-xs text-slate-500">Escribe el tema que quieras practicar y la IA crea una lección solo para ti.</p>
          <div className="mt-3 flex gap-2">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Ej: ordenar comida en un restaurante"
              className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-primary-500"
            />
            <Button className="h-10 shrink-0 px-3" onClick={handleGenerate} disabled={generating || !topic.trim()}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generar'}
            </Button>
          </div>
          {genError && <p className="mt-2 text-xs text-rose-600">{genError}</p>}
        </Card>
      ) : (
        <button onClick={() => navigate('/premium')} className="mt-3 w-full rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-left">
          <p className="text-sm font-bold text-primary-700">✨ Lecciones IA on-demand</p>
          <p className="text-xs text-slate-600">Genera lecciones del tema que quieras con Premium IA.</p>
        </button>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setSkill('all')}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            skill === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Todas
        </button>
        {index?.skills.map((s) => (
          <button
            key={s}
            onClick={() => setSkill(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              skill === s ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {SKILL_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {(index?.lessons ?? []).map((l: Post21LessonSummary) => {
          const Icon = SKILL_ICONS[l.skill] ?? BookOpen;
          return (
            <button
              key={l.id}
              onClick={() => navigate(`/practice/${l.id}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-primary-300"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{l.title}</p>
                <p className="text-xs text-slate-500 capitalize">
                  {SITUATION_LABELS[l.situation] ?? l.situation} · {l.estimatedTime} min
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
          );
        })}
        {index && index.lessons.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Sin lecciones para esta habilidad.</p>}
        {!index && <Card className="p-6 text-center text-sm text-slate-500">Completa el reto de 21 días para desbloquear este contenido.</Card>}
      </div>
    </div>
  );
}
