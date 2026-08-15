import { Gauge } from 'lucide-react';
import { SPEED_OPTIONS, useSpeechSpeed, setSpeechSpeed } from '../utils/speechSettings';
import { cn } from '../utils/cn';

export function SpeechSpeedControl({ compact = false }: { compact?: boolean }) {
  const speed = useSpeechSpeed();
  return (
    <div className={cn('flex items-center gap-1.5', compact && 'justify-center')}>
      <Gauge className="h-3.5 w-3.5 text-slate-400" />
      <span className="text-[11px] font-semibold text-slate-500">Velocidad</span>
      <div className="flex rounded-full bg-slate-100 p-0.5">
        {SPEED_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setSpeechSpeed(o.value)}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
              speed === o.value ? 'bg-primary-600 text-white' : 'text-slate-500 hover:text-slate-700',
            )}
            aria-label={`Velocidad ${o.label}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
