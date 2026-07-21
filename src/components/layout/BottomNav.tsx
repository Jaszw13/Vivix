import { NavLink } from 'react-router-dom';
import { Dumbbell, ClipboardList, BarChart3, Library, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Dumbbell;
}

const items: NavItem[] = [
  { to: '/', label: '主控台', icon: Dumbbell },
  { to: '/plans', label: '計畫', icon: ClipboardList },
  { to: '/progress', label: '進度', icon: BarChart3 },
  { to: '/exercises', label: '動作', icon: Library },
  { to: '/settings', label: '設定', icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40">
      <div className="mx-3 mb-3 bg-bg-card/95 backdrop-blur-xl border border-border rounded-card shadow-card">
        <div className="grid grid-cols-5">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 transition-colors relative',
                  isActive ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent" />
                  )}
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[9px] uppercase tracking-wider font-bold">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
