import { cn } from '../../utils/cn';

export function ProgressBar({ value, className, barClassName }: { value: number; className?: string; barClassName?: string }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70', className)}>
      <div
        className={cn('h-full rounded-full bg-primary-600 transition-all duration-300', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}