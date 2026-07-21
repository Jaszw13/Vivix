import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  inset?: boolean;
}

export function Card({ children, className, inset, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'bg-bg-card rounded-card shadow-card border border-border/40',
        inset && 'bg-bg-secondary',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-end justify-between mb-3', className)}>
      <div>
        <h2 className="font-display text-2xl tracking-wide text-text-primary uppercase">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export function StatTile({ label, value, unit, highlight }: StatTileProps) {
  return (
    <div className="flex flex-col items-center justify-center py-3">
      <div
        className={cn(
          'font-mono font-bold leading-none',
          highlight ? 'text-auxiliary text-2xl' : 'text-text-primary text-2xl'
        )}
      >
        {value}
        {unit && <span className="text-xs ml-0.5 text-text-secondary">{unit}</span>}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-text-secondary mt-1.5">
        {label}
      </div>
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'accent' | 'auxiliary';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-bg-secondary text-text-secondary border-border',
    accent: 'bg-accent-soft text-accent border-accent/30',
    auxiliary: 'bg-auxiliary/15 text-auxiliary border-auxiliary/30',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
