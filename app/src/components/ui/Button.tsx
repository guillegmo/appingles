import { cn } from '../../utils/cn';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-soft',
  secondary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-soft',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
  ghost: 'text-primary-600 hover:bg-primary-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-soft',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
};

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}