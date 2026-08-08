import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  Flame,
  Heart,
  Scale,
  Sparkles,
  X,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, Badge } from '@/components/ui/Card';
import { useProfileStore, TRAINING_GOAL_LABELS, type TrainingGoalValue } from '@/store/profileStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { trainingPlans, getPlanById } from '@/data/plans';

const DEFAULT_BEGINNER_PLAN_ID = '5x5-strength';

const STEPS = ['welcome', 'goal', 'recommend', 'tutorial'] as const;
type StepId = (typeof STEPS)[number];

export default function Onboarding() {
  const navigate = useNavigate();
  const completeOnboarding = useProfileStore((s) => s.completeOnboarding);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const setActivePlan = useWorkoutStore((s) => s.setActivePlan);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<TrainingGoalValue | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const step = STEPS[stepIdx];
  const next = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  const finish = () => {
    // 略過或早期完成時用戶可能未選目標，預設健康目標（唔會導致 return 後白屏）
    const finalGoal: TrainingGoalValue = goal ?? 'health';
    // 寫入用戶名
    if (name.trim()) updateProfile({ name: name.trim() });
    completeOnboarding(finalGoal);
    // 預設新手 5x5 追蹤計畫
    setActivePlan(DEFAULT_BEGINNER_PLAN_ID);
    navigate('/', { replace: true });
  };

  const plan = getPlanById(DEFAULT_BEGINNER_PLAN_ID) ?? trainingPlans[0];
  const firstDay = plan?.days[0];

  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto bg-bg-primary flex flex-col">
      <div className="flex items-center justify-between h-14 px-3">
        {stepIdx > 0 ? (
          <button
            onClick={back}
            className="w-10 h-10 -ml-1 flex items-center justify-center text-text-secondary hover:text-text-primary"
            aria-label="返回"
          >
            <X size={20} />
          </button>
        ) : (
          <div className="w-10 h-10" />
        )}
        {/* 進度點 */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <motion.div
              key={s}
              animate={{ width: i === stepIdx ? 24 : 8 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'h-1.5 rounded-full transition-colors duration-200',
                i <= stepIdx ? 'bg-accent' : 'bg-border/60'
              )}
            />
          ))}
        </div>
        <button
          onClick={finish}
          className="text-[11px] uppercase tracking-wider text-text-secondary hover:text-accent font-bold"
        >
          略過
        </button>
      </div>

      <main className="flex-1 flex flex-col px-5 pt-2 pb-6">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <StepWelcome
              key="welcome"
              name={name}
              setName={setName}
              onNext={next}
            />
          )}
          {step === 'goal' && (
            <StepGoal
              key="goal"
              selected={goal}
              setSelected={(g) => {
                setGoal(g);
                setTimeout(next, 180);
              }}
            />
          )}
          {step === 'recommend' && plan && firstDay && (
            <StepRecommend
              key="recommend"
              plan={plan}
              dayName={firstDay.dayName}
              onNext={next}
            />
          )}
          {step === 'tutorial' && (
            <StepTutorial
              key="tutorial"
              canFinish={goal !== null}
              onFinish={finish}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============ Step 1: 歡迎 + 暱稱 ============

function StepWelcome({
  name,
  setName,
  onNext,
}: {
  name: string;
  setName: (s: string) => void;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="flex-1 flex flex-col"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 22 }}
        className="w-28 h-28 mx-auto mt-10 rounded-[28px] bg-gradient-to-br from-accent/25 via-accent/10 to-auxiliary/20 flex items-center justify-center border border-accent/40"
      >
        <span className="font-display text-6xl tracking-wider text-accent drop-shadow-md">
          V
        </span>
        <Sparkles
          size={20}
          className="absolute translate-x-[46px] translate-y-[-34px] text-auxiliary"
          strokeWidth={2.5}
        />
      </motion.div>

      <h1 className="font-display text-4xl tracking-wide uppercase text-text-primary mt-10 text-center leading-tight">
        歡迎來到
        <br />
        <span className="bg-gradient-to-r from-accent to-auxiliary bg-clip-text text-transparent">
          Vivix
        </span>
      </h1>
      <p className="text-sm text-text-secondary text-center mt-3 leading-relaxed max-w-[22rem] mx-auto">
        你的新手健身教練。
        <br />
        30 秒之後，你就會知道「今日練咩、點做」。
      </p>

      <div className="mt-10">
        <label className="text-[10px] uppercase tracking-widest text-text-secondary block mb-2">
          想我點稱呼你？（可以留空）
        </label>
        <input
          type="text"
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onNext()}
          placeholder="例如：阿強"
          className="w-full h-12 px-4 bg-bg-card rounded-button border-2 border-border text-base text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      <div className="mt-auto pt-8">
        <Button fullWidth size="lg" onClick={onNext}>
          <ArrowRight size={18} /> 開始
        </Button>
      </div>
    </motion.div>
  );
}

// ============ Step 2: 選目標 ============

const GOAL_ICONS: Record<TrainingGoalValue, typeof Flame> = {
  muscle: Dumbbell,
  fatloss: Scale,
  health: Heart,
};

function StepGoal({
  selected,
  setSelected,
}: {
  selected: TrainingGoalValue | null;
  setSelected: (g: TrainingGoalValue) => void;
}) {
  const goals: TrainingGoalValue[] = ['muscle', 'fatloss', 'health'];
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="flex-1 flex flex-col"
    >
      <p className="text-[10px] uppercase tracking-widest text-text-secondary">
        第二步
      </p>
      <h1 className="font-display text-3xl tracking-wide uppercase text-text-primary mt-2 leading-tight">
        你最想達到什麼？
      </h1>
      <p className="text-sm text-text-secondary mt-2 leading-relaxed">
        我會根據目標推薦適合的新手入門計畫。
      </p>

      <div className="flex flex-col gap-3 mt-6">
        {goals.map((g, i) => {
          const Icon = GOAL_ICONS[g];
          const info = TRAINING_GOAL_LABELS[g];
          const isSel = selected === g;
          return (
            <motion.button
              key={g}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setSelected(g)}
              className={cn(
                'relative p-4 rounded-card border-2 text-left transition-all',
                isSel
                  ? 'border-accent bg-gradient-to-br from-accent/10 via-bg-card to-bg-card shadow-card'
                  : 'border-border/60 bg-bg-card hover:border-accent/40'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center',
                    isSel ? 'bg-accent text-bg-primary' : 'bg-accent-soft text-accent'
                  )}
                >
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg tracking-wide uppercase text-text-primary">
                    {info.title}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">{info.desc}</p>
                </div>
                <CheckCircle2
                  size={22}
                  className={cn(
                    'transition-all',
                    isSel ? 'text-accent opacity-100 scale-100' : 'opacity-0 scale-75'
                  )}
                />
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[11px] text-text-secondary">
        💡 新手不建議太急，先培養規律，目標後續都可以改。
      </p>
    </motion.div>
  );
}

// ============ Step 3: 推薦新手計畫 ============

function StepRecommend({
  plan,
  dayName,
  onNext,
}: {
  plan: { name: string; description: string; cover: string; days: { exercises: { name: string; targetSets: number; targetReps: string }[] }[] };
  dayName: string;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="flex-1 flex flex-col"
    >
      <p className="text-[10px] uppercase tracking-widest text-text-secondary">
        第三步 · 為你推薦
      </p>
      <h1 className="font-display text-3xl tracking-wide uppercase text-text-primary mt-2 leading-tight">
        我幫你揀咗：
      </h1>

      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 22 }}
        className="mt-5"
      >
        <Card className="relative overflow-hidden p-0 border-accent/40">
          <div className="relative h-32 bg-gradient-to-br from-bg-secondary via-bg-secondary to-accent/10 flex items-center justify-center">
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, var(--accent) 0, var(--accent) 1px, transparent 1px, transparent 12px)',
              }}
            />
            <Badge variant="accent" className="absolute top-3 left-3 z-10">
              教練推薦
            </Badge>
            <span className="relative font-display text-7xl tracking-wider text-accent">
              {plan.cover}
            </span>
          </div>
          <div className="p-4">
            <h3 className="font-display text-2xl tracking-wide uppercase text-text-primary">
              {plan.name}
            </h3>
            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
              {plan.description}
            </p>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                  今日練
                </div>
                <div className="font-display text-lg tracking-wide uppercase text-text-primary mt-0.5">
                  {dayName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                  今日動作
                </div>
                <div className="font-mono text-lg font-bold text-accent mt-0.5">
                  {plan.days[0].exercises.length} 個
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <p className="mt-6 text-sm text-text-secondary leading-relaxed">
        🎯 <b className="text-text-primary">點解揀呢個？</b>
        <br />
        因為三大項（深蹲/臥推/划船/硬舉）係新手入門最快建立力量嘅路徑，5 組 × 5 次唔太難跟，每完成一次都有清晰進步感。
      </p>

      <div className="mt-auto pt-6">
        <Button fullWidth size="lg" onClick={onNext}>
          <ArrowRight size={18} /> 下一步：學下點記錄
        </Button>
      </div>
    </motion.div>
  );
}

// ============ Step 4: 教學 ============

function StepTutorial({
  canFinish,
  onFinish,
}: {
  canFinish: boolean;
  onFinish: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="flex-1 flex flex-col"
    >
      <p className="text-[10px] uppercase tracking-widest text-text-secondary">
        最後一步 · 教練語錄
      </p>
      <h1 className="font-display text-3xl tracking-wide uppercase text-text-primary mt-2 leading-tight">
        點樣記錄一組？
      </h1>

      <div className="flex flex-col gap-3 mt-5">
        <TipCard
          icon={<CheckCircle2 size={20} />}
          title="每做完一組 → 剔勾勾"
          desc="完成一個組數就按咗旁邊個圓圈，即刻跳去休息倒數，唔好分心。"
        />
        <TipCard
          icon={<Info size={20} />}
          title="RPE 係咩？"
          desc="主觀費力指數：1 = 完全唔使力，10 = 完全力竭。新手建議停喺 7~8，留 2~3 下力就好，先學控制動作。"
        />
        <TipCard
          icon={<Flame size={20} />}
          title="熱身一定要做"
          desc="訓練日開頭有 5–6 個熱身步驟，做完先入工作組，保護你唔受傷。"
        />
      </div>

      <div className="mt-6 p-4 rounded-card bg-accent/10 border border-accent/30">
        <p className="text-xs text-text-secondary leading-relaxed">
          「<b className="text-text-primary">唔好追求大重量，先追求連續 7 日訓練。</b>
          <br />Vivix 會幫你記錄進度，解鎖成就，做你入健身房嘅第一個教練。」
          <span className="text-accent font-bold"> — 你的 Vivix 教練</span>
        </p>
      </div>

      <div className="mt-auto pt-6">
        <Button
          fullWidth
          size="lg"
          onClick={onFinish}
          disabled={!canFinish}
        >
          <Sparkles size={18} /> 完成，開始訓練
        </Button>
      </div>
    </motion.div>
  );
}

function TipCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Card className="p-3.5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <h4 className="font-bold text-sm text-text-primary">{title}</h4>
          <p className="text-[11.5px] text-text-secondary mt-0.5 leading-relaxed">
            {desc}
          </p>
        </div>
      </div>
    </Card>
  );
}
