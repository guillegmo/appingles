import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../utils/cn';

// Icono de ayuda con explicación: en escritorio se muestra al pasar el mouse,
// en pantallas táctiles (sin hover) se abre/cierra con un tap.
export function Tooltip({ text, className }: { text: string; className?: string }) {
  const [hoverCapable, setHoverCapable] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.('(hover: hover)');
    if (!mq) return;
    const update = () => setHoverCapable(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <span className={cn('relative inline-flex align-middle', className)}>
      <button
        type="button"
        aria-label="Ver explicación"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => hoverCapable && setOpen(true)}
        onMouseLeave={() => hoverCapable && setOpen(false)}
        className="inline-flex cursor-help text-slate-400 hover:text-primary-500"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 block w-60 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-normal leading-snug text-white shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}