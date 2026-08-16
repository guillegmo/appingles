import { cn } from '../../utils/cn';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft', className)}
      {...props}
    />
  );
}