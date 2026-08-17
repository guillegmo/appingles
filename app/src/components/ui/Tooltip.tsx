import { Info } from 'lucide-react';
import { cn } from '../../utils/cn';

// Icono de ayuda con tooltip explicativo al pasar el mouse.
export function Tooltip({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn('group relative inline-flex align-middle', className)}>
      <Info className="h-3.5 w-3.5 cursor-help text-slate-400 hover:text-primary-500" />
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 hidden w-60 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-normal leading-snug text-white shadow-lg group-hover:block group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}