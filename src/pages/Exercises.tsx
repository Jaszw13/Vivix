import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Dumbbell, Edit3, Trash2, AlertTriangle, Plus } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Card, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { exercises as builtinExercises } from '@/data/exercises';
import {
  CATEGORY_LABELS,
  MUSCLE_GROUP_OPTIONS,
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENT_TYPE_OPTIONS,
} from '@/types';
import type { MuscleGroup, EquipmentType, Exercise } from '@/types';
import { useWorkoutStore } from '@/store/workoutStore';
import { cn } from '@/lib/utils';

type CategoryFilter = MuscleGroup | 'all';
type EquipmentFilter = EquipmentType | 'all';

export default function Exercises() {
  const navigate = useNavigate();
  const customExercises = useWorkoutStore((s) => s.customExercises);
  const editCustomExercise = useWorkoutStore((s) => s.editCustomExercise);
  const deleteCustomExercise = useWorkoutStore((s) => s.deleteCustomExercise);

  const [category, setCategory] = useState<CategoryFilter>('all');
  const [equipment, setEquipment] = useState<EquipmentFilter>('all');
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // 合併內建 + 自訂動作
  const allExercises = useMemo<Exercise[]>(
    () => [...builtinExercises, ...customExercises],
    [customExercises]
  );

  const filtered = allExercises.filter((ex) => {
    if (category !== 'all' && ex.muscleGroup !== category) return false;
    if (equipment !== 'all' && ex.equipmentType !== equipment) return false;
    if (query && !ex.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  // 偵測遺留未分類自訂動作（舊 migrate 暫填 chest + muscleGroupDesc 含「尚未分類」）
  const uncategorizedCount = customExercises.filter(
    (c) => c.muscleGroupDesc?.includes('尚未分類') || c.equipmentDesc?.includes('尚未分類')
  ).length;

  return (
    <PageShell title="動作資料庫">
      {/* 未分類提示（T-03 邊界處理） */}
      {uncategorizedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-button bg-amber-500/10 border border-amber-500/30"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-text-primary leading-relaxed">
              有 {uncategorizedCount} 個自訂動作尚未補齊分類，
              將無法準確計入部位成就。請至各動作詳細頁補填部位與器械。
            </div>
          </div>
        </motion.div>
      )}

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

      {/* 部位 filter */}
      <div className="mb-2">
        <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">部位</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          <CategoryChip
            label="全部"
            active={category === 'all'}
            onClick={() => setCategory('all')}
          />
          {MUSCLE_GROUP_OPTIONS.map((c) => (
            <CategoryChip
              key={c.value}
              label={CATEGORY_LABELS[c.value]}
              active={category === c.value}
              onClick={() => setCategory(c.value)}
            />
          ))}
        </div>
      </div>

      {/* 器械 filter */}
      <div className="mb-5">
        <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">器械</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          <CategoryChip
            label="全部"
            active={equipment === 'all'}
            onClick={() => setEquipment('all')}
          />
          {EQUIPMENT_TYPE_OPTIONS.map((e) => (
            <CategoryChip
              key={e.value}
              label={EQUIPMENT_TYPE_LABELS[e.value]}
              active={equipment === e.value}
              onClick={() => setEquipment(e.value)}
            />
          ))}
        </div>
      </div>

      {/* 動作卡片網格 */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((ex, i) => {
          const isUncategorized =
            ex.isCustom &&
            ((ex as any).muscleGroupDesc?.includes('尚未分類') ||
              (ex as any).equipmentDesc?.includes('尚未分類'));
          return (
            <motion.button
              key={ex.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i % 6) * 0.04 }}
              onClick={() => navigate(`/exercises/${ex.id}`)}
              className="text-left relative group"
            >
              <Card className="p-0 overflow-hidden h-full">
                {/* 圖示區 */}
                <div className="relative h-24 bg-gradient-to-br from-bg-secondary to-accent/5 flex items-center justify-center">
                  <div
                    className="absolute inset-0 opacity-5"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, var(--accent) 0, var(--accent) 1px, transparent 1px, transparent 8px)',
                    }}
                  />
                  <Dumbbell
                    size={36}
                    className={cn(
                      'relative strokeWidth-2',
                      isUncategorized ? 'text-amber-500' : 'text-accent'
                    )}
                  />
                  {isUncategorized && (
                    <div className="absolute top-1.5 right-1.5">
                      <AlertTriangle size={14} className="text-amber-500" />
                    </div>
                  )}
                </div>
                {/* 內容區 */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h3 className="text-sm font-bold text-text-primary line-clamp-1">
                      {ex.name}
                    </h3>
                    {ex.isCustom && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setEditingId(ex.id)}
                          className="w-5 h-5 flex items-center justify-center text-text-secondary hover:text-accent transition-colors"
                          title="編輯自訂動作"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`確定要刪除自訂動作「${ex.name}」嗎？\n（已保存的訓練記錄不會被刪除）`)) {
                              deleteCustomExercise(ex.id);
                            }
                          }}
                          className="w-5 h-5 flex items-center justify-center text-text-secondary hover:text-auxiliary transition-colors"
                          title="刪除自訂動作"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="accent">{CATEGORY_LABELS[ex.muscleGroup]}</Badge>
                    <Badge>{EQUIPMENT_TYPE_LABELS[ex.equipmentType]}</Badge>
                    {ex.isCustom && <Badge variant="auxiliary">自訂</Badge>}
                  </div>
                </div>
              </Card>
            </motion.button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-text-secondary mt-20 text-sm">
          找不到符合的動作
        </div>
      )}

      {/* 自訂動作編輯彈窗（最小版本：先允許修正分類） */}
      {editingId && (() => {
        const target = customExercises.find((c) => c.id === editingId);
        if (!target) return null;
        return (
          <CustomEditSheet
            exercise={target}
            onClose={() => setEditingId(null)}
            onSave={(patch) => {
              editCustomExercise(editingId, patch);
              setEditingId(null);
            }}
          />
        );
      })()}
    </PageShell>
  );
}

// ===== 自訂動作編輯 Sheet =====
function CustomEditSheet({
  exercise,
  onClose,
  onSave,
}: {
  exercise: { id: string; name: string; muscleGroup: MuscleGroup; equipmentType: EquipmentType; steps?: string[]; tips?: string[] };
  onClose: () => void;
  onSave: (patch: {
    name: string;
    muscleGroup: MuscleGroup;
    equipmentType: EquipmentType;
    steps?: string[];
    tips?: string[];
    muscleGroupDesc?: string;
    equipmentDesc?: string;
  }) => void;
}) {
  const [name, setName] = useState(exercise.name);
  const [muscle, setMuscle] = useState<MuscleGroup>(exercise.muscleGroup);
  const [equip, setEquip] = useState<EquipmentType>(exercise.equipmentType);
  const canSave = name.trim().length > 0;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-[480px] max-h-[90vh] bg-bg-primary rounded-t-3xl sm:rounded-3xl border border-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-text-primary">編輯自訂動作</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-sm">
            關閉
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Field label="動作名稱" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 bg-bg-card rounded-button border border-border text-sm text-text-primary focus:border-accent transition-colors"
              placeholder="例如：繩索三頭下壓"
            />
          </Field>

          <Field label="部位（必填）" required>
            <div className="grid grid-cols-3 gap-2">
              {MUSCLE_GROUP_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setMuscle(o.value)}
                  className={cn(
                    'py-2 text-xs rounded-button border transition-colors',
                    muscle === o.value
                      ? 'bg-accent text-bg-primary border-accent'
                      : 'bg-bg-card text-text-secondary border-border hover:text-text-primary'
                  )}
                >
                  {o.emoji} · {o.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="器械類型（必填）" required>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_TYPE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setEquip(o.value)}
                  className={cn(
                    'py-2 text-xs rounded-button border transition-colors',
                    equip === o.value
                      ? 'bg-accent text-bg-primary border-accent'
                      : 'bg-bg-card text-text-secondary border-border hover:text-text-primary'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="p-4 border-t border-border flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button
            className="flex-1"
            disabled={!canSave}
            onClick={() =>
              onSave({
                name: name.trim(),
                muscleGroup: muscle,
                equipmentType: equip,
                // 補分類後移除「尚未分類」標記
                muscleGroupDesc: undefined,
                equipmentDesc: undefined,
              })
            }
          >
            儲存變更
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-text-secondary mb-2">
        {label}
        {required && <span className="text-auxiliary ml-1">*</span>}
      </label>
      {children}
    </div>
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
