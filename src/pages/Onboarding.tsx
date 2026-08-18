import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  Flame,
  Heart,
  Scale,
  X,
  Info,
  Cat,
  Dog,
  Pencil,
  Gift,
  Upload,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
// 註：Sparkles 已移除，改用 Dumbbell 作為品牌純啞鈴圖標
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, Badge } from '@/components/ui/Card';
import { useProfileStore, TRAINING_GOAL_LABELS, type TrainingGoalValue } from '@/store/profileStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { trainingPlans, getPlanById, DEFAULT_BEGINNER_PLAN_ID } from '@/data/plans';
import { usePartnerStore } from '@/features/partner/stores/partnerStore';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';
import { CAT_DEFAULT_NAMES, DOG_DEFAULT_NAMES } from '@/features/partner/data/partnerNames';
import type { PartnerSpecies } from '@/features/partner/types';
import type { TrainingPlan } from '@/types';
import ImportHistoryModal from '@/components/ImportHistoryModal';
import { WEEK_MS } from '@/utils/time';

// Errata E7：Lane A 以現有序列為準（partner→goal→recommend→tutorial），**僅前置 experience**
// STEPS 陣列成員對兩 lane 相同，goal 頁內部依 lane 切換「選目標」或「選頻率」
const STEPS = ['welcome', 'experience', 'partner', 'goal', 'recommend', 'tutorial'] as const;
type StepId = (typeof STEPS)[number];

type ExperienceChoice = 'beginner' | 'experienced' | 'excel';
type FreqBucket = '1' | '2' | '3-4' | '5+';
const FREQ_PLAN_MAP: Record<FreqBucket, string> = {
  '1': DEFAULT_BEGINNER_PLAN_ID,          // 5×5
  '2': 'upper-lower',                      // 上下分裂
  '3-4': 'push-pull-legs',                 // PPL
  '5+': 'push-pull-legs',                  // PPL（E5）
};
const PLAN_FREQ_RATIONALE: Record<FreqBucket, string> = {
  '1': '每週 1 次先培養規律，5×5 全身入門是最穩的起步。',
  '2': '每週 2 次以上可用上下分裂，上下半身輪流恢復。',
  '3-4': '每週 3–4 次節奏適合推拉腿 PPL，部位刺激更聚焦。',
  '5+': '每週 5 次以上同樣建議 PPL，把恢復日排在訓練日之間。',
};

export default function Onboarding() {
  const navigate = useNavigate();
  const completeOnboarding = useProfileStore((s) => s.completeOnboarding);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const setActivePlan = useWorkoutStore((s) => s.setActivePlan);
  const createPartner = usePartnerStore((s) => s.createPartner);
  const telemetryLog = useTelemetryStore((s) => s.log);
  // E5：Lane B 頻率計算需讀既有的匯入 session
  const existingSessions = useWorkoutStore((s) => s.sessions);

  const [name, setName] = useState('');
  const [goal, setGoal] = useState<TrainingGoalValue | null>(null);
  const [partnerSpecies, setPartnerSpecies] = useState<PartnerSpecies | null>(null);
  const [partnerName, setPartnerName] = useState('');
  const [stepIdx, setStepIdx] = useState(0);

  // I-1 / Errata E7 / T8：experience 狀態（beginner= Lane A；experienced/excel = Lane B；persist 時 normalize）
  const [experience, setExperience] = useState<ExperienceChoice | null>(null);
  // E5：Lane B 頻率選擇（chips 或 8 週平均自動推斷）
  const [freqBucket, setFreqBucket] = useState<FreqBucket | null>(null);
  // Lane B excel 用戶的 inline 匯入 wizard
  const [importOpen, setImportOpen] = useState(false);

  const step = STEPS[stepIdx];
  const next = () => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  const isLaneA = experience === null || experience === 'beginner';
  const isLaneB = experience === 'experienced' || experience === 'excel';

  // E5：近 8 週頻率自動推斷（Lane B 已匯入 session 時）
  const autoFreq = useMemo<FreqBucket | null>(() => {
    if (isLaneA) return null;
    if (!existingSessions || existingSessions.length === 0) return null;
    const now = Date.now();
    const windowStart = now - 8 * WEEK_MS;
    const trainDaysInWindow = new Set<string>();
    let minDateMs = now;
    for (const s of existingSessions) {
      const dMs = new Date(s.date).getTime();
      if (!Number.isFinite(dMs)) continue;
      if (dMs < minDateMs) minDateMs = dMs;
      if (dMs >= windowStart) trainDaysInWindow.add(new Date(dMs).toDateString());
    }
    const rangeStart = Math.max(minDateMs, windowStart);
    const spanMs = now - rangeStart;
    const spanWeeks = Math.max(1, Math.ceil(spanMs / WEEK_MS) || 1);
    const eligibleWeeks = Math.min(8, spanWeeks);
    const avg = trainDaysInWindow.size / eligibleWeeks;
    if (avg >= 2.5) return '5+';
    if (avg >= 1.5) return '3-4';
    if (avg >= 1) return '2';
    return '1';
  }, [existingSessions, isLaneA]);

  // Lane B：優先自動推斷，否則用戶手選 chips
  const resolvedFreq: FreqBucket | null = autoFreq ?? freqBucket;
  const recommendedPlanId: string = useMemo(() => {
    if (isLaneA) return DEFAULT_BEGINNER_PLAN_ID;
    if (resolvedFreq) return FREQ_PLAN_MAP[resolvedFreq];
    return DEFAULT_BEGINNER_PLAN_ID; // fallback
  }, [isLaneA, resolvedFreq]);

  const plan = getPlanById(recommendedPlanId) ?? getPlanById(DEFAULT_BEGINNER_PLAN_ID) ?? trainingPlans[0];
  const firstDay = plan?.days?.[0];

  function setExperienceAndLog(choice: ExperienceChoice) {
    setExperience(choice);
    const persistLevel: 'beginner' | 'experienced' = choice === 'beginner' ? 'beginner' : 'experienced';
    // T8 / R-5 telemetry
    try { telemetryLog('onboarding_experience_selected', { level: persistLevel }); } catch {
      // 忽略 telemetry 失敗，不阻斷 onboarding
    }
    // 同步 update profile（原始事實 persist v3）
    if (typeof updateProfile === 'function') {
      try { updateProfile({ experienceLevel: persistLevel }); } catch { /* noop */ }
    }
    setTimeout(next, 200);
  }

  const finish = () => {
    // 略過或早期完成時用戶可能未選目標，預設健康目標
    const finalGoal: TrainingGoalValue = goal ?? 'health';
    // 寫入用戶名
    if (name.trim()) typeof updateProfile === 'function' && updateProfile({ name: name.trim() });
    // 若尚未在 setExperienceAndLog 內寫入（防呆），再補一筆
    if (typeof updateProfile === 'function') {
      const persistLevel: 'beginner' | 'experienced' = isLaneA ? 'beginner' : 'experienced';
      try { updateProfile({ experienceLevel: persistLevel }); } catch { /* noop */ }
    }
    // 建立 Partner（§19: 用戶必須選 cat 或 dog）
    const finalSpecies: PartnerSpecies = partnerSpecies ?? 'cat';
    const finalPartnerName = partnerName.trim() ||
      (finalSpecies === 'cat' ? CAT_DEFAULT_NAMES[0] : DOG_DEFAULT_NAMES[0]);
    if (typeof createPartner === 'function') {
      try {
        createPartner(finalSpecies, finalPartnerName);
        telemetryLog('partner_selected', { species: finalSpecies, name: finalPartnerName });
        telemetryLog('onboarding_completed', { goal: finalGoal });
      } catch (e) {
        console.warn('[Onboarding] createPartner skipped:', e);
      }
    }
    if (typeof completeOnboarding === 'function') completeOnboarding(finalGoal);
    // 設定 active plan（Lane A = 5×5；Lane B = 依 E5 頻率推斷）
    if (typeof setActivePlan === 'function') {
      try {
        setActivePlan(recommendedPlanId);
      } catch (e) {
        console.warn('[Onboarding] setActivePlan skipped:', e);
      }
    }
    navigate('/', { replace: true });
  };

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
          {step === 'experience' && (
            <StepExperience
              key="experience"
              selected={experience}
              setSelected={setExperienceAndLog}
              excelHasImported={existingSessions.length > 0}
            />
          )}
          {step === 'partner' && (
            <StepPartner
              key="partner"
              selected={partnerSpecies}
              setSelected={(s) => {
                setPartnerSpecies(s);
                // 預設名跟 species
                if (!partnerName.trim()) {
                  setPartnerName(s === 'cat' ? CAT_DEFAULT_NAMES[0] : DOG_DEFAULT_NAMES[0]);
                }
              }}
              partnerName={partnerName}
              setPartnerName={setPartnerName}
              onNext={next}
            />
          )}
          {step === 'goal' && isLaneA && (
            <StepGoal
              key="goal-beginner"
              selected={goal}
              setSelected={(g) => {
                setGoal(g);
                setTimeout(next, 180);
              }}
            />
          )}
          {step === 'goal' && isLaneB && (
            <StepFrequencyLaneB
              key="goal-experienced"
              autoFreq={autoFreq}
              bucket={freqBucket}
              setBucket={setFreqBucket}
              isExcelUser={experience === 'excel'}
              onOpenImport={() => setImportOpen(true)}
              onNext={() => next()}
              canProceed={resolvedFreq !== null}
              existingCount={existingSessions.length}
              onSkipGoal={(g) => setGoal(g)}
            />
          )}
          {step === 'recommend' && plan && firstDay && (
            <StepRecommend
              key="recommend"
              plan={plan}
              dayName={firstDay.dayName ?? 'Day 1'}
              lane={isLaneA ? 'A' : 'B'}
              rationale={
                isLaneA
                  ? '因為三大項（深蹲/臥推/划船/硬舉）是新手入門最快建立力量的路徑，5 組 × 5 次不會太難跟隨，每完成一次都有清晰進步感。'
                  : (resolvedFreq ? PLAN_FREQ_RATIONALE[resolvedFreq] : '從你的過去節奏出發，為你選擇最適合的計畫密度。')
              }
              onNext={next}
            />
          )}
          {step === 'tutorial' && (
            <StepTutorial
              key="tutorial"
              canFinish={isLaneB ? true : goal !== null}
              onFinish={finish}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Lane B（Excel/經驗）可選 inline 匯入 wizard（共用 ImportHistoryModal 元件）*/}
      <ImportHistoryModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onGoTrain={() => setImportOpen(false)}
        onGoAchievements={() => setImportOpen(false)}
        defaultMode="matrix"
      />
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
        className="w-[96px] h-[96px] mx-auto mt-10 overflow-hidden rounded-2xl shadow-lg border border-accent/10"
      >
        <img
          src="/icons/vivix-icon-light.png"
          alt="Vivix"
          className="w-full h-full object-cover"
          draggable={false}
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
        30 秒之後，你就會知道「今日訓練項目與動作方式」。
      </p>

      <div className="mt-10">
        <label className="text-[10px] uppercase tracking-widest text-text-secondary block mb-2">
          想我如何稱呼你？（可以留空）
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

// ============ Step 1.5: 訓練經驗（I-1 / Errata E7；Lane A/B 分流起點） ============

function StepExperience({
  selected,
  setSelected,
  excelHasImported,
}: {
  selected: ExperienceChoice | null;
  setSelected: (c: ExperienceChoice) => void;
  excelHasImported: boolean;
}) {
  const options: { id: ExperienceChoice; label: string; desc: string; icon: typeof Sparkles }[] = [
    { id: 'beginner', icon: Sparkles, label: '第一次進健身房', desc: '我從零開始，需要教練帶你練。' },
    { id: 'experienced', icon: Dumbbell, label: '有在練，但還沒系統記錄', desc: '我會動作，但想開始留下每一次進步。' },
    { id: 'excel', icon: Upload, label: '用 Excel / 其他 App 記錄過', desc: '我有過去的訓練資料，希望 Vivix 承認它。' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="flex-1 flex flex-col"
    >
      <p className="text-[10px] uppercase tracking-widest text-text-secondary">
        第二步 · 認識你
      </p>
      <h1 className="font-display text-3xl tracking-wide uppercase text-text-primary mt-2 leading-tight">
        你的訓練經驗？
      </h1>
      <p className="text-sm text-text-secondary mt-2 leading-relaxed">
        Vivix 服務「記錄新手」：不管你是第一次進健身房，或是會練但還沒開始記錄，我們都同樣看重。
      </p>

      <div className="flex flex-col gap-3 mt-6">
        {options.map((opt, i) => {
          const Icon = opt.icon;
          const isSel = selected === opt.id;
          return (
            <motion.button
              key={opt.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setSelected(opt.id)}
              className={cn(
                'relative p-4 rounded-card border-2 text-left transition-all',
                isSel
                  ? 'border-accent bg-gradient-to-br from-accent/10 via-bg-card to-bg-card shadow-card'
                  : 'border-border/60 bg-bg-card hover:border-accent/40'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
                    isSel ? 'bg-accent text-bg-primary' : 'bg-accent-soft text-accent'
                  )}
                >
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg tracking-wide uppercase text-text-primary">
                    {opt.label}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{opt.desc}</p>
                  {opt.id === 'excel' && excelHasImported && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-bold">
                      <CheckCircle2 size={10} /> 偵測到本機已存在 {excelHasImported ? '歷史記錄' : ''}
                    </div>
                  )}
                </div>
                <CheckCircle2
                  size={22}
                  className={cn(
                    'transition-all flex-shrink-0',
                    isSel ? 'text-accent opacity-100 scale-100' : 'opacity-0 scale-75'
                  )}
                />
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[11px] text-text-secondary leading-relaxed">
        💡 稍後隨時都可以到「設定 / 匯入歷史記錄」補匯入。
      </p>
      <div className="mt-auto pt-8">
        <Button
          fullWidth
          size="lg"
          onClick={() => selected && setSelected(selected)}
          disabled={!selected}
        >
          <ArrowRight size={18} /> 下一步
        </Button>
      </div>
    </motion.div>
  );
}

// ============ Step 2: 選擇 Partner（§19） ============

function StepPartner({
  selected,
  setSelected,
  partnerName,
  setPartnerName,
  onNext,
}: {
  selected: PartnerSpecies | null;
  setSelected: (s: PartnerSpecies) => void;
  partnerName: string;
  setPartnerName: (s: string) => void;
  onNext: () => void;
}) {
  const species: { id: PartnerSpecies; icon: typeof Cat; label: string; desc: string; names: string[] }[] = [
    { id: 'cat', icon: Cat, label: '貓', desc: '冷靜、溫柔、安靜陪伴', names: CAT_DEFAULT_NAMES },
    { id: 'dog', icon: Dog, label: '狗', desc: '活力、鼓勵、溫暖同行', names: DOG_DEFAULT_NAMES },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="flex-1 flex flex-col"
    >
      <p className="text-[10px] uppercase tracking-widest text-text-secondary">
        第三步
      </p>
      <h1 className="font-display text-3xl tracking-wide uppercase text-text-primary mt-2 leading-tight">
        選擇你的訓練夥伴
      </h1>
      <p className="text-sm text-text-secondary mt-2 leading-relaxed">
        你訓練，Partner 成長。它會陪你記錄、陪你休息、陪你進步。
      </p>

      <div className="grid grid-cols-2 gap-3 mt-6">
        {species.map((s, i) => {
          const Icon = s.icon;
          const isSel = selected === s.id;
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setSelected(s.id)}
              className={cn(
                'relative p-4 rounded-card border-2 text-center transition-all',
                isSel
                  ? 'border-accent bg-gradient-to-br from-accent/10 via-bg-card to-bg-card shadow-card'
                  : 'border-border/60 bg-bg-card hover:border-accent/40'
              )}
            >
              <div
                className={cn(
                  'w-16 h-16 mx-auto rounded-2xl flex items-center justify-center',
                  isSel ? 'bg-accent text-bg-primary' : 'bg-accent-soft text-accent'
                )}
              >
                <Icon size={28} />
              </div>
              <h3 className="font-display text-lg tracking-wide uppercase text-text-primary mt-2">
                {s.label}
              </h3>
              <p className="text-[10px] text-text-secondary mt-0.5 leading-snug">{s.desc}</p>
              <CheckCircle2
                size={20}
                className={cn(
                  'absolute top-2 right-2 transition-all',
                  isSel ? 'text-accent opacity-100 scale-100' : 'opacity-0 scale-75'
                )}
              />
            </motion.button>
          );
        })}
      </div>

      {/* 改名區（可選） */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-5 overflow-hidden"
        >
          <label className="text-[10px] uppercase tracking-widest text-text-secondary flex items-center gap-1.5 mb-2">
            <Pencil size={11} /> 幫 Partner 改名（可以不改）
          </label>
          <div className="flex gap-2 flex-wrap mb-2">
            {(selected === 'cat' ? CAT_DEFAULT_NAMES : DOG_DEFAULT_NAMES).map((n) => (
              <button
                key={n}
                onClick={() => setPartnerName(n)}
                className={cn(
                  'px-3 py-1.5 rounded-button text-xs font-bold transition-colors',
                  partnerName === n
                    ? 'bg-accent text-bg-primary'
                    : 'bg-bg-card border border-border text-text-secondary hover:border-accent/40'
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={partnerName}
            maxLength={12}
            onChange={(e) => setPartnerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onNext()}
            placeholder="自訂名字…"
            className="w-full h-11 px-4 bg-bg-card rounded-button border-2 border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none transition-colors"
          />
        </motion.div>
      )}

      {/* 獎勵預覽（§19） */}
      <div className="mt-5 p-3.5 rounded-card bg-accent/8 border border-accent/25">
        <div className="flex items-center gap-2 mb-1.5">
          <Gift size={15} className="text-accent" />
          <span className="text-[11px] uppercase tracking-widest text-accent font-bold">
            完成今日訓練 → Partner 獲得 XP 並解鎖配件
          </span>
        </div>
        <p className="text-[11px] text-text-secondary leading-relaxed">
          3 次訓練內，Partner 會出現明顯成長變化。
        </p>
      </div>

      <div className="mt-auto pt-6">
        <Button
          fullWidth
          size="lg"
          onClick={onNext}
          disabled={!selected}
        >
          <ArrowRight size={18} /> 下一步
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
        第三步
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

// ============ Lane B Step 4：頻率選擇 / 8 週平均（Errata E5） ============

function StepFrequencyLaneB({
  autoFreq,
  bucket,
  setBucket,
  isExcelUser,
  onOpenImport,
  onNext,
  canProceed,
  existingCount,
  onSkipGoal,
}: {
  autoFreq: FreqBucket | null;
  bucket: FreqBucket | null;
  setBucket: (b: FreqBucket) => void;
  isExcelUser: boolean;
  onOpenImport: () => void;
  onNext: () => void;
  canProceed: boolean;
  existingCount: number;
  onSkipGoal: (g: TrainingGoalValue) => void;
}) {
  // Lane B 不強迫選目標，預設 'health'（React StrictMode：mount 階段 setState 需在 effect 內）
  useEffect(() => {
    if (typeof onSkipGoal === 'function') onSkipGoal('health');
  }, [onSkipGoal]);
  const chipOptions: { id: FreqBucket; label: string }[] = [
    { id: '1', label: '1 次 / 週' },
    { id: '2', label: '2 次 / 週' },
    { id: '3-4', label: '3–4 次 / 週' },
    { id: '5+', label: '5+ 次 / 週' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="flex-1 flex flex-col"
    >
      <p className="text-[10px] uppercase tracking-widest text-text-secondary">
        第四步 · 節奏
      </p>
      <h1 className="font-display text-3xl tracking-wide uppercase text-text-primary mt-2 leading-tight">
        你一週練幾天？
      </h1>
      <p className="text-sm text-text-secondary mt-2 leading-relaxed">
        計畫密度要對上現實節奏，才能長久跟隨。
      </p>

      {/* Excel 用戶：快速匯入 CTA */}
      {isExcelUser && existingCount === 0 && (
        <Card className="mt-5 p-3.5 border-auxiliary/30 bg-auxiliary/5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-auxiliary/15 text-auxiliary flex items-center justify-center flex-shrink-0">
              <Upload size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-text-primary">先匯入你的過去</h4>
              <p className="text-[11.5px] text-text-secondary mt-0.5 leading-relaxed">
                貼上 Excel 複製的訓練表，Vivix 會自動讀出你的過去節奏，為你推薦計畫。
              </p>
              <Button variant="danger" size="sm" className="mt-3" onClick={onOpenImport}>
                <Upload size={14} /> 開始匯入
              </Button>
            </div>
          </div>
        </Card>
      )}
      {existingCount > 0 && (
        <Card className="mt-5 p-3.5 border-accent/30 bg-accent/5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
              <CalendarDays size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-text-primary">已從你的歷史推斷節奏</h4>
              <p className="text-[11.5px] text-text-secondary mt-0.5 leading-relaxed">
                近 8 週平均約 <b className="text-accent">{autoFreq ?? '—'}</b> 頻率；以下 chips 可再調整。
              </p>
            </div>
            {autoFreq && <Badge variant="accent">{autoFreq}</Badge>}
          </div>
        </Card>
      )}

      {/* E5：chips 四選；有 auto 時預設高亮 */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {chipOptions.map((c, i) => {
          const selected = (autoFreq ?? bucket) === c.id;
          return (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setBucket(c.id)}
              className={cn(
                'h-20 rounded-card border-2 text-center flex flex-col items-center justify-center transition-all',
                selected
                  ? 'border-accent bg-gradient-to-br from-accent/12 via-bg-card to-bg-card shadow-card'
                  : 'border-border/60 bg-bg-card hover:border-accent/40'
              )}
            >
              <div className={cn(
                'font-display text-xl tracking-wide uppercase',
                selected ? 'text-accent' : 'text-text-primary'
              )}>
                {c.id}
              </div>
              <div className="text-[10px] text-text-secondary mt-1">{c.label}</div>
              {selected && <CheckCircle2 size={14} className="text-accent mt-1" />}
            </motion.button>
          );
        })}
      </div>

      {/* 選擇預告 */}
      {(autoFreq ?? bucket) && (
        <div className="mt-5 p-3.5 rounded-card bg-bg-card border border-border/40">
          <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">預估推薦</div>
          <div className="font-display text-lg tracking-wide uppercase text-text-primary">
            {FREQ_PLAN_MAP[(autoFreq ?? bucket) as FreqBucket] === DEFAULT_BEGINNER_PLAN_ID && '5×5 力量基礎'}
            {FREQ_PLAN_MAP[(autoFreq ?? bucket) as FreqBucket] === 'upper-lower' && '上下分裂'}
            {FREQ_PLAN_MAP[(autoFreq ?? bucket) as FreqBucket] === 'push-pull-legs' && '推拉腿 PPL'}
          </div>
          <div className="text-[11px] text-text-secondary mt-1 leading-relaxed">
            {PLAN_FREQ_RATIONALE[(autoFreq ?? bucket) as FreqBucket]}
          </div>
        </div>
      )}

      <div className="mt-auto pt-6 space-y-3">
        <Button
          fullWidth
          size="lg"
          onClick={onNext}
          disabled={!canProceed}
        >
          <ArrowRight size={18} /> 查看為你推薦的計畫
        </Button>
        <p className="text-center text-[11px] text-text-secondary">
          計畫與頻率隨時都可以到「計畫中心」調整。
        </p>
      </div>
    </motion.div>
  );
}

// ============ Step 5: 推薦計畫（Lane A / Lane B 皆使用） ============

function StepRecommend({
  plan,
  lane,
  rationale,
  dayName,
  onNext,
}: {
  plan: TrainingPlan;
  lane: 'A' | 'B';
  rationale: string;
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
        第五步 · 為你推薦
      </p>
      <h1 className="font-display text-3xl tracking-wide uppercase text-text-primary mt-2 leading-tight">
        我為你選擇了：
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
              Lane {lane} · {lane === 'A' ? '帶你練' : '承認你的過去'}
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
                  {(plan.days?.[0]?.exercises?.length ?? 0)} 個
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <p className="mt-6 text-sm text-text-secondary leading-relaxed">
        🎯 <b className="text-text-primary">為什麼選擇這個？</b>
        <br />
        {rationale}
      </p>

      {/* §19 獎勵預覽 */}
      <div className="mt-4 p-3.5 rounded-card bg-gradient-to-br from-accent/10 to-auxiliary/8 border border-accent/25">
        <div className="flex items-center gap-2 mb-1.5">
          <Gift size={15} className="text-accent" />
          <span className="text-[11px] uppercase tracking-widest text-accent font-bold">
            今日完成訓練後
          </span>
        </div>
        <ul className="text-[11.5px] text-text-secondary leading-relaxed space-y-1">
          <li>✓ Partner 獲得 40 XP，升至 Lv.2</li>
          <li>✓ 解鎖「起步」形態 + 運動頭帶配件</li>
          <li>✓ 再完成 2 次訓練 → Partner 進入「活躍」形態</li>
        </ul>
      </div>

      <div className="mt-auto pt-6">
        <Button fullWidth size="lg" onClick={onNext}>
          <ArrowRight size={18} /> 下一步：學習如何記錄
        </Button>
      </div>
    </motion.div>
  );
}

// ============ Step 6: 教學 ============

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
        如何記錄一組？
      </h1>

      <div className="flex flex-col gap-3 mt-5">
        <TipCard
          icon={<CheckCircle2 size={20} />}
          title="每做完一組 → 勾選完成"
          desc="完成一個組數就點旁邊的圓圈，立即跳至休息倒數，請勿分心。"
        />
        <TipCard
          icon={<Info size={20} />}
          title="RPE 是什麼？"
          desc="主觀費力指數：1 = 完全不用費力，10 = 完全力竭。新手建議停在 7~8，保留 2~3 下力即可，先學習控制動作。"
        />
        <TipCard
          icon={<Flame size={20} />}
          title="熱身一定要確實執行"
          desc="訓練日開頭有 5–6 個熱身步驟，確實執行後再進入工作組，保護你不受傷。"
        />
      </div>

      <div className="mt-6 p-4 rounded-card bg-accent/10 border border-accent/30">
        <p className="text-xs text-text-secondary leading-relaxed">
          「<b className="text-text-primary">不要追求大重量，先追求連續 7 天規律訓練。</b>
          <br />Vivix 會幫你記錄進度，解鎖成就，成為你進入健身房的第一個教練。」
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
          <Dumbbell size={18} /> 完成，開始訓練
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
