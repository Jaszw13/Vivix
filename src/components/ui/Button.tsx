import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-14 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth, className, children, ...rest },
  ref
) {
  const base =
    'inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wider transition-all active:translate-y-px disabled:opacity-40 disabled:pointer-events-none select-none';

  const variants: Record<Variant, string> = {
    primary:
      'bg-accent text-bg-primary rounded-button shadow-button hover:brightness-110',
    secondary:
      'border-2 border-accent text-accent rounded-button bg-transparent hover:bg-accent-soft',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary',
    danger:
      'border border-auxiliary/60 text-auxiliary rounded-button hover:bg-auxiliary/10',
  };

  return (
    <button
      ref={ref}
      className={cn(
        base,
        sizeClasses[size],
        variants[variant],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
