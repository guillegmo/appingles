import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Headphones, MessageCircle, PenLine, MessageSquare } from 'lucide-react';
import { getPost21 } from '../services/api';
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
  const [index, setIndex] = useState<Post21Index | null>(null);
  const [skill, setSkill] = useState<string>('all');

  useEffect(() => {
    (async () => {
      try {
        setIndex(await getPost21(skill === 'all' ? undefined : skill));
      } catch {
        setIndex(null);
      }
    })();
  }, [skill]);

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold">Aprendizaje continuo</h1>
      <p className="text-sm text-slate-500">Contenido post-21 por habilidad y situación.</p>

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
              <Button variant="ghost" size="sm">
                Abrir
              </Button>
            </button>
          );
        })}
        {index && index.lessons.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Sin lecciones para esta habilidad.</p>}
        {!index && <Card className="p-6 text-center text-sm text-slate-500">Completa el reto de 21 días para desbloquear este contenido.</Card>}
      </div>
    </div>
  );
}
