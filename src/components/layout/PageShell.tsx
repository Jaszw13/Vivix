import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomNav } from './BottomNav';

interface PageShellProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
  showNav?: boolean;
  rightAction?: ReactNode;
  noPadding?: boolean;
}

export function PageShell({
  children,
  title,
  showBack,
  showNav = true,
  rightAction,
  noPadding,
}: PageShellProps) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto bg-bg-primary flex flex-col">
      {(title || showBack || rightAction) && (
        <header className="sticky top-0 z-30 bg-bg-primary/95 backdrop-blur-xl border-b border-border">
          <div className="flex items-center h-14 px-3 gap-2">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 -ml-1 flex items-center justify-center text-text-primary hover:text-accent transition-colors"
                aria-label="返回"
              >
                <ChevronLeft size={24} strokeWidth={2.5} />
              </button>
            )}
            {title && (
              <h1 className="font-display text-xl tracking-wide uppercase text-text-primary flex-1 truncate">
                {title}
              </h1>
            )}
            {rightAction && <div className="ml-auto">{rightAction}</div>}
          </div>
        </header>
      )}
      <main
        className={cn(
          'flex-1 flex flex-col',
          !noPadding && 'px-4 py-4',
          showNav ? 'pb-28' : ''
        )}
      >
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
