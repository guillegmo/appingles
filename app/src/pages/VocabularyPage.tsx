import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Volume2, Lock } from 'lucide-react';
import { getVocabulary } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { speak } from '../utils/speech';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

type VocabItem = { en: string; es: string; addedAt: string };

export function VocabularyPage() {
  const navigate = useNavigate();
  const { entitlements } = useAppStore();
  const [items, setItems] = useState<VocabItem[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    getVocabulary(controller.signal)
      .then((r) => setItems(r.items))
      .catch((e) => {
        if ((e as { code?: string })?.code === 'ERR_CANCELED') return;
        if (e.response?.status === 403) setBlocked(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (blocked || !entitlements?.canUseVocabularyBank) {
    return (
      <div className="p-5">
        <h1 className="text-xl font-bold">Banco de vocabulario</h1>
        <Card className="mt-4">
          <div className="flex flex-col items-center py-6 text-center">
            <Lock className="h-8 w-8 text-slate-300" />
            <p className="mt-3 font-bold">Es parte de Premium IA</p>
            <p className="mt-1 text-sm text-slate-500">
              Cada palabra que fallas se guarda aquí automáticamente para repasarla cuando quieras.
            </p>
            <Button className="mt-4" variant="secondary" onClick={() => navigate('/premium')}>
              DESBLOQUEAR IA
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary-600" />
        <h1 className="text-xl font-bold">Banco de vocabulario</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Se arma solo con tus errores. {items.length > 0 && `${items.length} palabras guardadas.`}
      </p>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-400">Cargando…</p>
      ) : items.length === 0 ? (
        <Card className="mt-4 py-8 text-center text-sm text-slate-500">
          Aún no hay palabras. Falla un ejercicio y esta lista se llenará con lo que necesitas repasar.
        </Card>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((w) => (
            <Card key={w.en} className="flex items-center gap-3 p-3">
              <div className="flex-1">
                <p className="text-sm font-semibold">{w.en}</p>
                <p className="text-xs text-slate-500">{w.es}</p>
              </div>
              <button
                onClick={() => speak(w.en)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                aria-label={`Escuchar ${w.en}`}
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}