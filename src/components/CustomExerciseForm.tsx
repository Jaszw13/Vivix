// Errata E14：自訂動作共用表單
// 適用：Workout 新增自訂、Import Wizard Step2 新建自訂。
// 規則：
//   - MuscleGroup 未選 → CTA disabled
//   - Props 明確暴露 initialName / open / onClose / onCreated
//   - 依賴 workoutStore.addCustomExerciseV2 建立自訂動作（I-4 原創邏輯不動）
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MUSCLE_GROUP_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
  type MuscleGroup,
  type EquipmentType,
  type LiftFamily,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { useWorkoutStore, type CustomExercise } from '@/store/workoutStore';
import { cn } from '@/lib/utils';

export interface CustomExerciseFormProps {
  /** 初始名稱（Import Wizard Step2 預填用） */
  initialName?: string;
  /** 彈窗是否開啟 */
  open: boolean;
  /** 關閉 */
  onClose: () => void;
  /** 建立完成回呼（回傳新建的 CustomExercise） */
  onCreated: (exercise: CustomExercise) => void;
  /** CTA 文案，預設「儲存自訂動作」 */
  submitText?: string;
}

const LIFT_FAMILY_OPTIONS: { value: LiftFamily | ''; label: string }[] = [
  { value: '', label: '自動推斷' },
  { value: 'bench', label: '臥推' },
  { value: 'squat', label: '深蹲' },
  { value: 'deadlift', label: '硬舉' },
  { value: 'ohp', label: '肩推' },
];

export default function CustomExerciseForm({
  initialName = '',
  open,
  onClose,
  onCreated,
  submitText = '儲存自訂動作',
}: CustomExerciseFormProps) {
  const addCustomExerciseV2 = useWorkoutStore((s) => s.addCustomExerciseV2);

  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState<MuscleGroup | ''>('');
  const [equip, setEquip] = useState<EquipmentType>('barbell');
  const [liftFamily, setLiftFamily] = useState<LiftFamily | ''>('');
  const [steps, setSteps] = useState('');
  const [tips, setTips] = useState('');

  // 每次 initialName 變更或重新開啟，同步預填
  useEffect(() => {
    if (open) {
      setName(initialName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialName]);

  const canSubmit = name.trim().length > 0 && (muscle as MuscleGroup | '') !== '';

  const handleSubmit = () => {
    if (!canSubmit) return;
    const created = addCustomExerciseV2({
      name: name.trim(),
      muscleGroup: muscle as MuscleGroup,
      equipmentType: equip,
      liftFamily: liftFamily || undefined,
      steps: steps ? steps.split(/\n|；|;/).map((s) => s.trim()).filter(Boolean) : undefined,
      tips: tips ? tips.split(/\n|；|;/).map((s) => s.trim()).filter(Boolean) : undefined,
    });
    onCreated(created);
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/55 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-[480px] max-h-[92vh] bg-bg-primary rounded-t-3xl sm:rounded-3xl border border-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-text-primary">新增自訂動作</h3>
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
              placeholder="例如：單手啞鈴划船"
              maxLength={30}
              className="w-full h-11 px-3 bg-bg-card rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
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
                  {o.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="器械類型（必填）" required>
            <div className="grid grid-cols-4 gap-2">
              {EQUIPMENT_TYPE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setEquip(o.value)}
                  className={cn(
                    'py-2 text-[11px] rounded-button border transition-colors',
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

          <Field label="力量家族（選填）">
            <div className="flex flex-wrap gap-2">
              {LIFT_FAMILY_OPTIONS.map((o) => (
                <button
                  key={o.value || 'auto'}
                  type="button"
                  onClick={() => setLiftFamily(o.value)}
                  className={cn(
                    'py-1.5 px-3 text-[11px] rounded-button border transition-colors',
                    liftFamily === o.value
                      ? 'bg-accent text-bg-primary border-accent'
                      : 'bg-bg-card text-text-secondary border-border hover:text-text-primary'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-text-secondary/70 mt-1">
              指定後此動作歸入對應力量軌成就；未指定則依名稱自動推斷
            </p>
          </Field>

          <Field label="步驟（選填，每行一步驟）">
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              rows={3}
              placeholder={'雙腳與肩同寬\n髖部向後推\n保持背部挺直'}
              className="w-full px-3 py-2 bg-bg-card rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
            />
          </Field>

          <Field label="提示（選填，每行一項）">
            <textarea
              value={tips}
              onChange={(e) => setTips(e.target.value)}
              rows={3}
              placeholder={'核心繃緊\n不圓背\n控制節奏'}
              className="w-full px-3 py-2 bg-bg-card rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
            />
          </Field>
        </div>

        <div className="p-4 border-t border-border flex flex-col gap-2">
          <Button fullWidth disabled={!canSubmit} onClick={handleSubmit}>
            {submitText}
          </Button>
          {!canSubmit && (
            <p className="text-center text-[11px] text-text-secondary">
              請填寫名稱、選擇部位與器械類型
            </p>
          )}
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
      <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">
        {label} {required && <span className="text-auxiliary">*</span>}
      </div>
      {children}
    </div>
  );
}
