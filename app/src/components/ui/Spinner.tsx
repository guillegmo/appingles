import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-8 w-8 animate-spin text-primary-600', className)} />;
}

export function LoadingScreen({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8">
      <Spinner />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}