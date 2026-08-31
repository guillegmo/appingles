import { Volume2 } from 'lucide-react';
import { LessonImage } from './LessonImage';
import { speak } from '../utils/speech';
import type { VocabularyItem } from '../types';

// Tarjeta concepto → imagen → palabra → pronunciación → significado.
// Se usa en el paso "Aprender" para las palabras con imagen asociada; el resto
// del vocabulario sigue mostrándose como fila de texto (sin imagen no hay problema).
export function VisualVocabularyCard({ item }: { item: VocabularyItem }) {
  return (
    <button
      onClick={() => speak(item.en)}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-2 text-left hover:bg-slate-50"
    >
      <LessonImage asset={item.image} alt={item.image?.alt ?? item.en} className="h-16 w-16 shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">{item.en}</p>
        <p className="text-sm text-slate-500">{item.es}</p>
      </div>
      <Volume2 className="h-4 w-4 shrink-0 text-primary-500" />
    </button>
  );
}
