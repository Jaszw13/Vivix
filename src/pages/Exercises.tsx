import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Dumbbell } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, Badge } from '@/components/ui/Card';
import { exercises, exerciseCategories } from '@/data/exercises';
import { CATEGORY_LABELS } from '@/types';
import type { ExerciseCategory } from '@/types';
import { cn } from '@/lib/utils';

export default function Exercises() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const [query, setQuery] = useState('');

  const filtered = exercises.filter((ex) => {
    if (category !== 'all' && ex.category !== category) return false;
    if (query && !ex.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <PageShell title="動作資料庫">
      {/* 搜尋框 */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋動作…"
          className="w-full h-11 pl-9 pr-3 bg-bg-card rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary focus:border-accent transition-colors"
        />
      </div>

      {/* 分類標籤 */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 mb-4 pb-1">
        <CategoryChip
          label="全部"
          active={category === 'all'}
          onClick={() => setCategory('all')}
        />
        {exerciseCategories.map((c) => (
          <CategoryChip
            key={c.value}
            label={CATEGORY_LABELS[c.value]}
            active={category === c.value}
            onClick={() => setCategory(c.value)}
          />
        ))}
      </div>

      {/* 動作卡片網格 */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((ex, i) => (
          <motion.button
            key={ex.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i % 6) * 0.04 }}
            onClick={() => navigate(`/exercises/${ex.id}`)}
            className="text-left"
          >
            <Card className="p-0 overflow-hidden h-full">
              {/* 圖示區 */}
              <div className="relative h-24 bg-gradient-to-br from-bg-secondary to-accent/5 flex items-center justify-center">
                <div className="absolute inset-0 opacity-5" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, var(--accent) 0, var(--accent) 1px, transparent 1px, transparent 8px)'
                }} />
                <Dumbbell size={36} className="text-accent relative" strokeWidth={2} />
              </div>
              {/* 內容區 */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h3 className="text-sm font-bold text-text-primary line-clamp-1">
                    {ex.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="accent">
                    {CATEGORY_LABELS[ex.category]}
                  </Badge>
                  <span className="text-[10px] text-text-secondary">{ex.equipment}</span>
                </div>
              </div>
            </Card>
          </motion.button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-text-secondary mt-20 text-sm">
          找不到符合的動作
        </div>
      )}
    </PageShell>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-xs uppercase tracking-wider rounded-button whitespace-nowrap border transition-colors',
        active
          ? 'bg-accent text-bg-primary border-accent'
          : 'bg-transparent text-text-secondary border-border hover:text-text-primary'
      )}
    >
      {label}
    </button>
  );
}
