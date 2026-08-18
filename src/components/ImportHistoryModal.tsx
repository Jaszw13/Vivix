// 歷史記錄匯入 Wizard（I-2 雙模式；Errata v2.1）
// Step1：貼上 + 模式偵測 +（表格模式）欄位映射 + 單位/日期格式；（矩陣模式）顯示偵測到的年月/天數（可覆蓋）
// Step2：unique 動作名 → 映射（內建/既有自訂/新建自訂）；fuzzy 建議；未分類須完成才下一步
// Step3：預覽 sessions / 動作 / 日期 / 總噸 / skipped / Load warnings；確認後批次寫入
// 入口：Settings 常態入口、Onboarding Lane B；共用同一元件（E11：CTA 走 caller props，不寫字面 router path）
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, ArrowLeft, ArrowRight, Upload, ChevronDown, CheckCircle2, AlertTriangle,
  FileSpreadsheet, ClipboardList, Sparkles, Plus, Download, CalendarDays, Scale, FileDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, Badge } from '@/components/ui/Card';
import CustomExerciseForm from '@/components/CustomExerciseForm';
import { useWorkoutStore, type CustomExercise, getAllExercises } from '@/store/workoutStore';
import { useProfileStore } from '@/store/profileStore';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';
import type { Exercise, EquipmentType, MuscleGroup, WorkoutSession, ExerciseLog, SetLog } from '@/types';
import { MUSCLE_GROUP_LABELS, EQUIPMENT_TYPE_LABELS, EQUIPMENT_TYPE_OPTIONS } from '@/types';
import { generateId, estimate1RM } from '@/utils/workout';
import {
  detectMatrixMode, detectTableMode, parseMatrixTSV,
  type ParsedSession as MatrixParsedSession, type MatrixContextOverride, type MatrixLoadWarning,
} from '@/utils/matrixParser';
import {
  parseDate, csvToPreviewRows, buildTemplateBlob,
  type DateFormatHint, type UnitHint, type ParsedRow,
} from '@/utils/csv';
import { fuzzySuggest } from '@/utils/fuzzy';
import { resolveCurrentTaxonomy } from '@/features/exercises/taxonomy';
import RecognitionModal, { computeBatchRecognitionStats } from './RecognitionModal';
import { settleAll } from '@/features/stats/settleAll';

type Mode = 'matrix' | 'table' | null;
type StepId = 1 | 2 | 3;

export interface ImportHistoryModalProps {
  open: boolean;
  onClose: () => void;
  /** E11：使用現有導航機制，非字面路徑 */
  onGoTrain?: () => void;
  onGoAchievements?: () => void;
  /** (mode) 進入 wizard 第一步時觸發；caller 可記錄或跳轉到 CSV/矩陣說明 */
  onStarted?: (mode: Mode) => void;
  /** 完成（含關閉認可儀式後） */
  onCompleted?: (result: { mode: Mode; sessions: number; exercises: number; skipped: number }) => void;
  /** 預設 mode（Lane B 有 Excel 時可強制 matrix） */
  defaultMode?: 'matrix' | 'table' | null;
}

type ExerciseMapTarget =
  | { kind: 'builtin' | 'custom'; exercise: Exercise }
  | { kind: 'new'; name: string; muscleGroup: MuscleGroup; equipmentType: EquipmentType; customId: string };

const DATE_FORMATS: DateFormatHint[] = ['YYYY-MM-DD', 'YYYY/MM/DD', 'DD/MM/YYYY', 'MM/DD/YYYY'];
const DATE_FORMAT_LABELS: Record<DateFormatHint, string> = {
  'YYYY-MM-DD': '2026-01-15',
  'YYYY/MM/DD': '2026/01/15',
  'DD/MM/YYYY': '15/01/2026',
  'MM/DD/YYYY': '01/15/2026',
};

export default function ImportHistoryModal({
  open,
  onClose,
  onGoTrain,
  onGoAchievements,
  onStarted,
  onCompleted,
  defaultMode = null,
}: ImportHistoryModalProps) {
  const importSessionsBatch = useWorkoutStore((s) => s.importSessionsBatch);
  const allExercises = getAllExercises();
  const builtinNames = useMemo(() => allExercises.filter((e) => !e.isCustom).map((e) => e.name), [allExercises]);
  const customNameToExercise = useMemo(() => {
    const m = new Map<string, CustomExercise>();
    for (const ce of useWorkoutStore.getState().customExercises) m.set(ce.name, ce);
    return m;
  }, []);
  const builtinNameToExercise = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const e of allExercises) if (!e.isCustom) m.set(e.name, e);
    return m;
  }, [allExercises]);

  const tlog = useTelemetryStore((s) => s.log);

  const [step, setStep] = useState<StepId>(1);
  const [raw, setRaw] = useState('');
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [step1Touched, setStep1Touched] = useState(false);

  // 表格模式選項
  const [unit, setUnit] = useState<UnitHint>('kg');
  const [dateFmt, setDateFmt] = useState<DateFormatHint>('YYYY-MM-DD');
  const [fmtOpen, setFmtOpen] = useState(false);

  // 矩陣模式覆蓋
  const [yearOverride, setYearOverride] = useState<string>('');
  const [monthOverride, setMonthOverride] = useState<string>('');

  // matrix parse 結果（Step1 產生）
  const [matrixOut, setMatrixOut] = useState<{
    sessions: MatrixParsedSession[];
    skipped: number;
    warnings: MatrixLoadWarning[];
    detectedDays: number;
    year: number | null;
    month: number | null;
  } | null>(null);

  // table parse 結果（Step1 產生）
  const [tableOut, setTableOut] = useState<{
    rows: ParsedRow[];
    skipped: number;
  } | null>(null);

  // Step2：動作映射
  const [exerciseTargets, setExerciseTargets] = useState<Map<string, ExerciseMapTarget>>(new Map());
  const [customFormOpen, setCustomFormOpen] = useState(false);
  const [customFormName, setCustomFormName] = useState('');

  // Step3：確認
  const [importedSessionIds, setImportedSessionIds] = useState<string[]>([]);
  const [showRecognition, setShowRecognition] = useState(false);
  const [recognitionStats, setRecognitionStats] = useState<{
    sessions: number; trainingDays: number; totalPRs: number; achievementUnlocks: number; totalVolumeKg: number;
  }>({ sessions: 0, trainingDays: 0, totalPRs: 0, achievementUnlocks: 0, totalVolumeKg: 0 });

  // 可選動作下拉：選一個名字（內建/既有自訂）或「新建自訂…」
  const uniqueExerciseNames = useMemo(() => {
    if (mode === 'matrix') return Array.from(new Set((matrixOut?.sessions ?? []).flatMap((s) => s.exercises.map((e) => e.name))));
    if (mode === 'table') return Array.from(new Set((tableOut?.rows ?? []).map((r) => r.exerciseName)));
    return [] as string[];
  }, [mode, matrixOut, tableOut]);

  // 重置
  function resetAll() {
    setStep(1);
    setRaw('');
    setMode(defaultMode);
    setStep1Touched(false);
    setMatrixOut(null);
    setTableOut(null);
    setExerciseTargets(new Map());
    setImportedSessionIds([]);
    setShowRecognition(false);
  }

  function handleClose() {
    if (step1Touched) tlog('import_cancelled', { mode, step });
    resetAll();
    onClose();
  }

  // ---- Mode detect on paste ----
  function detectAndSetMode(text: string) {
    if (!text.trim()) { setMode(defaultMode); return; }
    if (detectMatrixMode(text)) setMode('matrix');
    else if (detectTableMode(text)) setMode('table');
    else setMode(null);
  }

  function runStep1() {
    if (!step1Touched) {
      setStep1Touched(true);
      tlog('import_started', { mode: mode ?? 'undetected' });
      if (onStarted) onStarted(mode);
    }
    if (mode === 'matrix') {
      const overrides: MatrixContextOverride = {};
      if (yearOverride) overrides.year = Number(yearOverride);
      if (monthOverride) overrides.month = Number(monthOverride);
      const r = parseMatrixTSV(raw, overrides);
      setMatrixOut({
        sessions: r.sessions,
        skipped: r.skipped,
        warnings: r.warnings,
        detectedDays: r.detectedDays,
        year: r.ctx?.year ?? null,
        month: r.ctx?.month ?? null,
      });
      // 初始化映射 targets：fuzzy 建議
      const names = Array.from(new Set(r.sessions.flatMap((s) => s.exercises.map((e) => e.name))));
      seedTargets(names);
      setStep(2);
    } else if (mode === 'table') {
      const rows = csvToPreviewRows(raw, { unit, dateFormat: dateFmt });
      setTableOut({ rows: rows.rows, skipped: rows.skipped });
      const names = Array.from(new Set(rows.rows.map((r) => r.exerciseName)));
      seedTargets(names);
      setStep(2);
    }
  }

  function seedTargets(names: string[]) {
    const next = new Map<string, ExerciseMapTarget>();
    for (const name of names) {
      // 1) exact 自訂
      if (customNameToExercise.has(name)) {
        next.set(name, { kind: 'custom', exercise: customNameToExercise.get(name)! });
        continue;
      }
      // 2) exact 內建
      if (builtinNameToExercise.has(name)) {
        next.set(name, { kind: 'builtin', exercise: builtinNameToExercise.get(name)! });
        continue;
      }
      // 3) fuzzy 建議
      const suggestions = fuzzySuggest(name, builtinNames, 1);
      if (suggestions.length > 0 && builtinNameToExercise.has(suggestions[0])) {
        next.set(name, { kind: 'builtin', exercise: builtinNameToExercise.get(suggestions[0])! });
        continue;
      }
      // 4) 未定義：待用戶選擇
      next.set(name, { kind: 'new', name, muscleGroup: 'chest', equipmentType: 'barbell', customId: generateId('custom-pending') });
    }
    setExerciseTargets(next);
  }

  const mappingComplete = useMemo(() => {
    if (uniqueExerciseNames.length === 0) return false;
    for (const name of uniqueExerciseNames) {
      const t = exerciseTargets.get(name);
      if (!t) return false;
      if (t.kind === 'new') return false; // new 需先建立自訂才可以下一步
    }
    return true;
  }, [uniqueExerciseNames, exerciseTargets]);

  // ---- 組建 session 並批次寫入 ----
  function confirmAndImport() {
    const final: WorkoutSession[] = [];
    const customExAfter = useWorkoutStore.getState().customExercises;
    if (mode === 'matrix' && matrixOut) {
      for (const ps of matrixOut.sessions) {
        final.push(buildSessionFromMatrix(ps, exerciseTargets, customExAfter));
      }
    } else if (mode === 'table' && tableOut) {
      // 按 dateISO 聚合，然後 exerciseName 聚合為 ExerciseLog
      const byDate = new Map<string, Map<string, Array<{ w: number; reps: number; bw: boolean }>>>();
      for (const r of tableOut.rows) {
        const dayMap = byDate.get(r.dateISO) ?? new Map<string, Array<{ w: number; reps: number; bw: boolean }>>();
        const arr = dayMap.get(r.exerciseName) ?? [];
        for (let i = 0; i < r.sets; i++) arr.push({ w: r.weightKg, reps: r.reps, bw: r.weightKg === 0 });
        dayMap.set(r.exerciseName, arr);
        byDate.set(r.dateISO, dayMap);
      }
      const dateKeys = Array.from(byDate.keys()).sort();
      for (const iso of dateKeys) {
        const dayMap = byDate.get(iso)!;
        const exercises: ExerciseLog[] = [];
        let vol = 0;
        for (const [exName, arr] of dayMap.entries()) {
          const t = exerciseTargets.get(exName);
          const tx = resolveTaxoFromTarget(exName, t, customExAfter);
          const sets: SetLog[] = arr.map((x, idx) => ({
            id: generateId('set'),
            setNumber: idx + 1,
            weight: x.w,
            reps: x.reps,
            completed: true,
          }));
          for (const s of sets) vol += s.weight * s.reps;
          exercises.push({
            id: generateId('ex'),
            exerciseId: tx.exerciseId,
            name: tx.name,
            muscleGroup: tx.muscleGroup,
            equipmentType: tx.equipmentType,
            sets,
          });
        }
        if (exercises.length === 0) continue;
        final.push({
          id: generateId('session'),
          date: new Date(iso).toISOString(),
          warmupCompletedIds: [],
          duration: 0,
          totalVolume: vol,
          exercises,
          startedAt: null,
          finishedAt: null,
          imported: true,
        });
      }
    }

    // 匯入（E12：單次 set()）
    importSessionsBatch(final);

    // settleAll：{ silent: true, skipPartner: true }
    // 注意：importSessionsBatch 同步 set state；緊接著 settleAll（讀 getState()）是可見的。
    const res = settleAll(undefined, { silent: true, skipPartner: true });

    // 準備認可儀式：這批 session 的本地統計 + 成就解鎖數（unlocks 包含 permanent 補解鎖的）
    const batchStats = computeBatchRecognitionStats(final, customExAfter, res.achievementUnlocks);
    setRecognitionStats({
      sessions: batchStats.sessions,
      trainingDays: batchStats.trainingDays,
      totalPRs: batchStats.totalPRs,
      achievementUnlocks: res.achievementUnlocks.length,
      totalVolumeKg: batchStats.totalVolumeKg,
    });

    // Telemetry：完成
    tlog('import_completed', {
      mode,
      sessions: final.length,
      exercises: new Set(final.flatMap((s: WorkoutSession) => s.exercises.map((e) => e.exerciseId))).size,
      skipped: (mode === 'matrix' ? matrixOut?.skipped : tableOut?.skipped) ?? 0,
    });

    setImportedSessionIds(final.map((s) => s.id));
    setStep(3);
    if (final.length > 0) setShowRecognition(true);
    if (onCompleted && final.length > 0) {
      onCompleted({
        mode,
        sessions: final.length,
        exercises: new Set(final.flatMap((s: WorkoutSession) => s.exercises.map((e) => e.exerciseId))).size,
        skipped: (mode === 'matrix' ? matrixOut?.skipped : tableOut?.skipped) ?? 0,
      });
    }
  }

  // ---- UI helpers ----
  function setTarget(name: string, target: ExerciseMapTarget) {
    const next = new Map(exerciseTargets);
    next.set(name, target);
    setExerciseTargets(next);
  }

  function openCustomFormFor(rawName: string) {
    setCustomFormName(rawName);
    setCustomFormOpen(true);
  }

  // Step3 彙總
  const step3Summary = useMemo(() => {
    const dates = mode === 'matrix'
      ? (matrixOut?.sessions ?? []).map((s) => s.dateISO)
      : mode === 'table' ? Array.from(new Set((tableOut?.rows ?? []).map((r) => r.dateISO))) : [];
    const sorted = [...dates].sort();
    const totalVol = mode === 'matrix'
      ? (matrixOut?.sessions ?? []).reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.reduce((c, x) => c + x.weight * x.reps, 0), 0), 0)
      : (tableOut?.rows ?? []).reduce((a, r) => a + r.weightKg * r.reps * r.sets, 0);
    return {
      sessionCount: mode === 'matrix' ? (matrixOut?.sessions.length ?? 0) : new Set((tableOut?.rows ?? []).map((r) => r.dateISO)).size,
      exerciseCount: uniqueExerciseNames.length,
      minDate: sorted[0] ?? '—',
      maxDate: sorted[sorted.length - 1] ?? '—',
      skipped: mode === 'matrix' ? (matrixOut?.skipped ?? 0) : (tableOut?.skipped ?? 0),
      warningsCount: mode === 'matrix' ? (matrixOut?.warnings.length ?? 0) : 0,
      totalVol,
    };
  }, [mode, matrixOut, tableOut, uniqueExerciseNames]);

  if (!open) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="import-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            key="import-panel"
            initial={{ y: 260, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 260, opacity: 0 }}
            transition={{ type: 'spring', damping: 28 }}
            className="w-full max-w-[520px] max-h-[92vh] bg-bg-primary rounded-t-3xl sm:rounded-3xl border border-border flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (step > 1) setStep((s) => (s - 1) as StepId);
                    else handleClose();
                  }}
                  className="w-9 h-9 -ml-1.5 flex items-center justify-center text-text-secondary hover:text-text-primary"
                  aria-label="返回"
                >
                  {step > 1 ? <ArrowLeft size={20} /> : <X size={20} />}
                </button>
                <div>
                  <h3 className="font-display text-xl tracking-wide uppercase text-text-primary">匯入歷史記錄</h3>
                  <p className="text-[10px] uppercase tracking-widest text-text-secondary">Step {step} / 3</p>
                </div>
              </div>
              <button onClick={handleClose} className="text-text-secondary hover:text-text-primary text-sm">關閉</button>
            </div>

            {/* Progress bar */}
            <div className="px-5 pt-3 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((n) => (
                  <motion.div
                    key={n}
                    animate={{ width: n === step ? 32 : 12 }}
                    transition={{ duration: 0.22 }}
                    className={cn(
                      'h-1.5 rounded-full transition-colors duration-200',
                      n <= step ? 'bg-accent' : 'bg-border/60'
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <Step1
                    key="step1"
                    raw={raw}
                    setRaw={(v) => { setRaw(v); if (!mode) detectAndSetMode(v); }}
                    mode={mode}
                    setMode={(m) => { setMode(m); }}
                    unit={unit}
                    setUnit={setUnit}
                    dateFmt={dateFmt}
                    setDateFmt={setDateFmt}
                    fmtOpen={fmtOpen}
                    setFmtOpen={setFmtOpen}
                    yearOverride={yearOverride}
                    setYearOverride={setYearOverride}
                    monthOverride={monthOverride}
                    setMonthOverride={setMonthOverride}
                    matrixCtx={matrixOut ? { year: matrixOut.year, month: matrixOut.month, days: matrixOut.detectedDays } : null}
                  />
                )}
                {step === 2 && (
                  <Step2
                    key="step2"
                    names={uniqueExerciseNames}
                    targets={exerciseTargets}
                    setTarget={setTarget}
                    builtinNames={builtinNames}
                    builtinNameToExercise={builtinNameToExercise}
                    customNameToExercise={customNameToExercise}
                    openCustomForm={openCustomFormFor}
                  />
                )}
                {step === 3 && (
                  <Step3
                    key="step3"
                    summary={step3Summary}
                    mode={mode}
                    warnings={mode === 'matrix' ? (matrixOut?.warnings ?? []) : []}
                    done={importedSessionIds.length > 0}
                  />
                )}
              </AnimatePresence>
            </div>

            <div className="p-5 border-t border-border flex flex-col gap-2 flex-shrink-0">
              {step === 1 && (
                <Button fullWidth size="lg" disabled={!mode || !raw.trim()} onClick={runStep1}>
                  <Upload size={18} /> 開始解析
                </Button>
              )}
              {step === 2 && (
                <Button fullWidth size="lg" disabled={!mappingComplete} onClick={() => setStep(3)}>
                  <CheckCircle2 size={18} /> 完成映射並預覽
                </Button>
              )}
              {step === 3 && importedSessionIds.length === 0 && (
                <Button fullWidth size="lg" onClick={confirmAndImport}>
                  <Sparkles size={18} /> 確認匯入並永久承接
                </Button>
              )}
              {step === 3 && importedSessionIds.length > 0 && (
                <Button fullWidth size="lg" variant="secondary" onClick={handleClose}>
                  關閉
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* CustomExerciseForm 復用 (Errata E14) */}
      <CustomExerciseForm
        open={customFormOpen}
        initialName={customFormName}
        onClose={() => { setCustomFormOpen(false); }}
        onCreated={(ce) => {
          // 把 customFormName 對應的 target 改為新建自訂
          setTarget(customFormName, { kind: 'custom', exercise: ce });
          // 同時加進 customNameToExercise（本地映射快取，後續同名會命中 exact）
          customNameToExercise.set(ce.name, ce);
          setCustomFormOpen(false);
        }}
        submitText="建立並套用"
      />

      {/* E8：每批一次認可儀式 */}
      <RecognitionModal
        open={showRecognition}
        stats={recognitionStats}
        onClose={() => { setShowRecognition(false); }}
        onGoTrain={onGoTrain}
        onGoAchievements={onGoAchievements}
      />
    </>
  );
}

// ============================================================
// 子步驟元件
// ============================================================

function Step1(props: {
  raw: string;
  setRaw: (v: string) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  unit: UnitHint;
  setUnit: (u: UnitHint) => void;
  dateFmt: DateFormatHint;
  setDateFmt: (d: DateFormatHint) => void;
  fmtOpen: boolean;
  setFmtOpen: (b: boolean) => void;
  yearOverride: string;
  setYearOverride: (s: string) => void;
  monthOverride: string;
  setMonthOverride: (s: string) => void;
  matrixCtx: { year: number | null; month: number | null; days: number } | null;
}) {
  const { raw, setRaw, mode, setMode, unit, setUnit, dateFmt, setDateFmt, fmtOpen, setFmtOpen,
    yearOverride, setYearOverride, monthOverride, setMonthOverride, matrixCtx } = props;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
      <Card className="p-4">
        <label className="text-[10px] uppercase tracking-widest text-text-secondary block mb-2">
          貼上你的訓練記錄（Excel 複製或 CSV 貼上）
        </label>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={9}
          spellCheck={false}
          className="w-full rounded-button border border-border bg-bg-secondary px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none resize-y"
          placeholder={'Excel 矩陣模式：從試算表複製 2026 July 區塊並貼上（含 7月11日 等日期欄）\n\n表格 CSV 模式：\ndate,exercise,weight_kg,reps\n2026-01-15,Back Squat,60,5'}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={mode === 'matrix' ? 'accent' : mode === 'table' ? 'default' : 'auxiliary'}>
            <FileSpreadsheet size={11} /> 矩陣模式
          </Badge>
          <Badge variant={mode === 'table' ? 'accent' : mode === 'matrix' ? 'default' : 'auxiliary'}>
            <ClipboardList size={11} /> 表格模式
          </Badge>
          {!mode && raw.trim() && (
            <Badge variant="auxiliary"><AlertTriangle size={11} /> 無法自動判斷，請手動選擇</Badge>
          )}
          {raw.trim() && !mode && (
            <div className="flex gap-2 mt-2 w-full">
              <button onClick={() => setMode('matrix')} className="px-3 py-1.5 text-[11px] rounded-button border border-border text-text-secondary hover:border-accent hover:text-accent">手動：矩陣</button>
              <button onClick={() => setMode('table')} className="px-3 py-1.5 text-[11px] rounded-button border border-border text-text-secondary hover:border-accent hover:text-accent">手動：表格</button>
            </div>
          )}
        </div>
      </Card>

      {mode === 'table' && (
        <Card className="p-4 space-y-4">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <CalendarDays size={16} className="text-accent" /> 表格模式設定
          </h4>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">重量單位（若 cell 本身含 kg/lb 將優先使用）</div>
            <div className="grid grid-cols-2 gap-2">
              {(['kg', 'lb'] as UnitHint[]).map((u) => (
                <button key={u} onClick={() => setUnit(u)} className={cn(
                  'py-2 text-xs rounded-button border transition-colors',
                  unit === u ? 'bg-accent text-bg-primary border-accent' : 'bg-bg-card text-text-secondary border-border hover:text-text-primary'
                )}>
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">日期格式</div>
            <button onClick={() => setFmtOpen(!fmtOpen)} className="w-full h-11 px-3 bg-bg-card rounded-button border border-border flex items-center justify-between text-sm text-text-primary">
              <span className="font-mono">{DATE_FORMAT_LABELS[dateFmt]}</span>
              <ChevronDown size={16} className="text-text-secondary" />
            </button>
            {fmtOpen && (
              <div className="mt-2 rounded-button border border-border bg-bg-card p-1 shadow-card">
                {DATE_FORMATS.map((f) => (
                  <button key={f} onClick={() => { setDateFmt(f); setFmtOpen(false); }} className={cn(
                    'w-full text-left px-3 py-2 text-xs rounded-button flex items-center justify-between',
                    dateFmt === f ? 'text-accent bg-accent-soft' : 'text-text-secondary hover:text-text-primary'
                  )}>
                    <span className="font-mono">{DATE_FORMAT_LABELS[f]}</span>
                    {dateFmt === f && <CheckCircle2 size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-2 flex items-center justify-between">
              <span>範本下載（E13）</span>
              <span className="text-[9px] opacity-70">一列一組</span>
            </div>
            <Button variant="secondary" fullWidth onClick={() => {
              const blob = buildTemplateBlob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'vivix-import-template.csv'; a.click();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
            }}>
              <FileDown size={16} /> 下載 CSV 範本
            </Button>
          </div>
        </Card>
      )}

      {mode === 'matrix' && (
        <Card className="p-4 space-y-3">
          <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Scale size={16} className="text-accent" /> 矩陣模式 · 年月上下文
          </h4>
          {matrixCtx && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="偵測年份" value={matrixCtx.year ? matrixCtx.year.toString() : '—'} />
              <MiniStat label="偵測月份" value={matrixCtx.month ? matrixCtx.month.toString() : '—'} />
              <MiniStat label="偵測天數" value={matrixCtx.days.toString()} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">強制年份</div>
              <input
                type="number" value={yearOverride} onChange={(e) => setYearOverride(e.target.value)}
                placeholder="例：2026"
                className="w-full h-10 px-3 bg-bg-card rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">強制月份 (1-12)</div>
              <input
                type="number" min={1} max={12} value={monthOverride} onChange={(e) => setMonthOverride(e.target.value)}
                placeholder="例：7"
                className="w-full h-10 px-3 bg-bg-card rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-text-secondary leading-relaxed">
            若你的資料為「無年份標題」的工作表，請手動指定年月。矩陣中若出現 Feedback 多行註解，將自動併入當日附註。
          </p>
        </Card>
      )}
    </motion.div>
  );
}

function Step2(props: {
  names: string[];
  targets: Map<string, ExerciseMapTarget>;
  setTarget: (name: string, t: ExerciseMapTarget) => void;
  builtinNames: string[];
  builtinNameToExercise: Map<string, Exercise>;
  customNameToExercise: Map<string, CustomExercise>;
  openCustomForm: (name: string) => void;
}) {
  const { names, targets, setTarget, builtinNames, builtinNameToExercise, customNameToExercise, openCustomForm } = props;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      <p className="text-[11px] text-text-secondary leading-relaxed">
        下方為解析出的動作名稱。我們已盡力模糊比對內建動作；若找不到或想指定既有自訂／建立新自訂，請在此調整。<b className="text-text-primary">所有動作都需完成對應才可以下一步</b>。
      </p>
      <div className="flex flex-col gap-2">
        {names.length === 0 && (
          <Card className="p-4 text-center text-xs text-text-secondary">暫無動作可供對應</Card>
        )}
        {names.map((name) => {
          const t = targets.get(name);
          const suggestions = fuzzySuggest(name, builtinNames, 3);
          const unresolved = !t || t.kind === 'new';
          let hint = '';
          if (t?.kind === 'builtin') hint = `內建 · ${MUSCLE_GROUP_LABELS[t.exercise.muscleGroup]}/${EQUIPMENT_TYPE_LABELS[t.exercise.equipmentType]}`;
          else if (t?.kind === 'custom') hint = `自訂 · ${MUSCLE_GROUP_LABELS[t.exercise.muscleGroup]}/${EQUIPMENT_TYPE_LABELS[t.exercise.equipmentType]}`;
          else hint = '未對應 · 請選擇或新建自訂';
          return (
            <Card key={name} className={cn('p-3 transition-colors', unresolved ? 'border-auxiliary/50' : '')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-text-primary truncate">{name}</div>
                  <div className={cn(
                    'text-[10px] uppercase tracking-widest mt-0.5',
                    unresolved ? 'text-auxiliary' : 'text-text-secondary'
                  )}>{hint}</div>
                  {suggestions.length > 0 && unresolved && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {suggestions.map((s) => (
                        <button key={s} onClick={() => setTarget(name, { kind: 'builtin', exercise: builtinNameToExercise.get(s)! })}
                          className="text-[10px] px-2 py-1 rounded border border-accent/40 text-accent bg-accent/5 hover:bg-accent-soft uppercase tracking-wider">
                          建議：{s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <MappingDropdown
                  current={t}
                  name={name}
                  onPickBuiltin={(e) => setTarget(name, { kind: 'builtin', exercise: e })}
                  onPickCustom={(e) => setTarget(name, { kind: 'custom', exercise: e })}
                  onPickNew={() => openCustomForm(name)}
                  builtinNames={builtinNames}
                  builtinNameToExercise={builtinNameToExercise}
                  customList={Array.from(customNameToExercise.values())}
                />
              </div>
              {!unresolved && t && 'exercise' in t && (
                <ExerciseMapRowButton
                  label="更換內建"
                  options={builtinNames.filter((n) => n !== name).slice(0, 120)}
                  onPick={(n) => builtinNameToExercise.has(n) && setTarget(name, { kind: 'builtin', exercise: builtinNameToExercise.get(n)! })}
                />
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button onClick={() => openCustomForm(name)}
                  className="text-[10px] px-2 py-1 rounded border border-border text-text-secondary hover:border-accent hover:text-accent uppercase tracking-wider flex items-center gap-1">
                  <Plus size={11} /> 新建自訂動作（分類必填）
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}

function Step3(props: {
  summary: { sessionCount: number; exerciseCount: number; minDate: string; maxDate: string; skipped: number; warningsCount: number; totalVol: number };
  mode: Mode;
  warnings: MatrixLoadWarning[];
  done: boolean;
}) {
  const { summary, mode, warnings, done } = props;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
      <Card className="p-4">
        <h4 className="text-sm font-bold text-text-primary mb-3">匯入預覽</h4>
        <div className="grid grid-cols-2 gap-2 divide-y divide-border/60 sm:divide-none">
          <MiniStat label="訓練次數" value={summary.sessionCount.toString()} />
          <MiniStat label="動作種類" value={summary.exerciseCount.toString()} />
          <MiniStat label="最早日期" value={summary.minDate} mono />
          <MiniStat label="最近日期" value={summary.maxDate} mono />
          <MiniStat label="總噸數" value={`${(summary.totalVol / 1000).toFixed(1)} t`} />
          <MiniStat label="略過列" value={summary.skipped.toString()} highlight={summary.skipped > 0} />
        </div>
      </Card>

      {!done && mode === 'matrix' && warnings.length > 0 && (
        <Card className="p-4 border-auxiliary/40">
          <h4 className="text-sm font-bold text-auxiliary mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Load 交叉驗證警告（{warnings.length}）
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {warnings.slice(0, 20).map((w, i) => (
              <div key={i} className="text-[11px] font-mono text-text-secondary leading-snug">
                <span className="text-auxiliary">{w.dateISO}</span> · <span className="text-text-primary">{w.exerciseName}</span>{' '}
                Σ={w.actual} vs Excel Load={w.expected}（|Δ|={w.diff.toFixed(1)}）
              </div>
            ))}
            {warnings.length > 20 && <div className="text-[10px] text-text-secondary">…還有 {warnings.length - 20} 項</div>}
          </div>
          <p className="text-[10px] text-text-secondary mt-2">警告僅提示，不阻斷匯入。建議核對最極端的數項。</p>
        </Card>
      )}

      {done ? (
        <Card className="p-4 border-accent/40">
          <h4 className="text-sm font-bold text-accent flex items-center gap-1.5"><CheckCircle2 size={14} /> 匯入完成</h4>
          <p className="text-[11px] text-text-secondary mt-2 leading-relaxed">
            你的歷史紀錄已正式寫入 Vivix。成就、連續天數、器械記憶、PR 列表皆已更新。可關閉視窗，或在隨後出現的「認可儀式」選擇前往成就牆或開始今日訓練。
          </p>
        </Card>
      ) : (
        <Card className="p-4">
          <h4 className="text-sm font-bold text-text-primary mb-2">確認事項</h4>
          <ul className="text-[11px] text-text-secondary space-y-1.5 leading-relaxed">
            <li>✓ 匯入的 session 會標記「匯入」，計入 PR、連續天數、成就、器械記憶、報告。</li>
            <li>✓ 熱量估算、Partner XP 與形態解鎖<b className="text-text-primary">不包含</b>匯入紀錄（避免稀釋）。</li>
            <li>✓ 成就一旦解鎖即永久保留；即使之後刪除匯入 session 也不會消失。</li>
            <li>✓ 若你發現動作對應有誤，可刪除匯入的訓練紀錄後重新匯入。</li>
          </ul>
        </Card>
      )}
    </motion.div>
  );
}

// ================= 內部小工具 =================

function MiniStat({ label, value, highlight, mono }: { label: string; value: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div className="py-2">
      <div className={cn(
        'font-mono font-bold leading-tight text-lg',
        highlight ? 'text-auxiliary' : 'text-text-primary'
      )}>
        <span className={cn(mono && 'font-mono text-sm')}>{value}</span>
      </div>
      <div className="text-[10px] uppercase tracking-widest text-text-secondary mt-0.5">{label}</div>
    </div>
  );
}

function MappingDropdown(props: {
  current: ExerciseMapTarget | undefined;
  name: string;
  onPickBuiltin: (e: Exercise) => void;
  onPickCustom: (e: CustomExercise) => void;
  onPickNew: () => void;
  builtinNames: string[];
  builtinNameToExercise: Map<string, Exercise>;
  customList: CustomExercise[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { builtinNames, builtinNameToExercise, customList, current, onPickBuiltin, onPickCustom, onPickNew } = props;
  const filteredBuiltin = builtinNames.filter((n) => n.toLowerCase().includes(q.toLowerCase())).slice(0, 50);
  const filteredCustom = customList.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 30);
  return (
    <div className="relative flex-shrink-0">
      <button onClick={() => setOpen((o) => !o)} className={cn(
        'h-9 px-3 text-[10px] uppercase tracking-wider rounded-button border transition-colors',
        current?.kind === 'new' || !current
          ? 'border-auxiliary/50 text-auxiliary bg-auxiliary/5'
          : 'border-border text-text-secondary hover:text-text-primary'
      )}>
        {current?.kind === 'builtin' ? '內建' : current?.kind === 'custom' ? '自訂' : '未對應'} <ChevronDown size={12} className="inline -mt-0.5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-72 max-h-80 overflow-y-auto rounded-card border border-border bg-bg-card z-10 shadow-card p-2">
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋動作名稱…"
            className="w-full h-9 px-2 mb-2 rounded-button border border-border text-xs text-text-primary bg-bg-secondary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
          />
          <div className="text-[10px] uppercase tracking-widest text-text-secondary px-1 mb-1">內建動作</div>
          {filteredBuiltin.length === 0 && <div className="text-[11px] text-text-secondary/70 px-1 py-1">無結果</div>}
          {filteredBuiltin.map((n) => {
            const e = builtinNameToExercise.get(n)!;
            const sel = current?.kind === 'builtin' && current.exercise.name === n;
            return (
              <button key={n} onClick={() => { onPickBuiltin(e); setOpen(false); }} className={cn(
                'w-full text-left px-2 py-1.5 text-xs rounded-button flex items-center justify-between',
                sel ? 'bg-accent-soft text-accent' : 'text-text-secondary hover:text-text-primary'
              )}>
                <span className="truncate">{n}</span>
                {sel && <CheckCircle2 size={12} />}
              </button>
            );
          })}
          {customList.length > 0 && (
            <>
              <div className="text-[10px] uppercase tracking-widest text-text-secondary px-1 mt-2 mb-1">既有自訂</div>
              {filteredCustom.map((c) => {
                const sel = current?.kind === 'custom' && current.exercise.id === c.id;
                return (
                  <button key={c.id} onClick={() => { onPickCustom(c); setOpen(false); }} className={cn(
                    'w-full text-left px-2 py-1.5 text-xs rounded-button flex items-center justify-between',
                    sel ? 'bg-accent-soft text-accent' : 'text-text-secondary hover:text-text-primary'
                  )}>
                    <span className="truncate">{c.name}</span>
                    {sel && <CheckCircle2 size={12} />}
                  </button>
                );
              })}
            </>
          )}
          <div className="mt-2 pt-2 border-t border-border/60">
            <button onClick={() => { onPickNew(); setOpen(false); }}
              className="w-full px-2 py-1.5 text-xs rounded-button text-auxiliary hover:bg-auxiliary/10 flex items-center gap-1.5">
              <Plus size={12} /> 新建自訂動作…
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseMapRowButton({ label, options, onPick }: {
  label: string; options: string[]; onPick: (n: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = options.filter((n) => n.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  return (
    <div className="mt-2 relative inline-block">
      <button onClick={() => setOpen((o) => !o)} className="text-[10px] px-2 py-1 rounded border border-border text-text-secondary hover:border-accent hover:text-accent uppercase tracking-wider">
        {label}
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-60 max-h-72 overflow-y-auto rounded-card border border-border bg-bg-card z-10 shadow-card p-2">
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋…"
            className="w-full h-8 px-2 mb-1.5 rounded-button border border-border text-xs text-text-primary bg-bg-secondary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
          />
          {filtered.length === 0 && <div className="text-[11px] text-text-secondary/70 px-1 py-1">無結果</div>}
          {filtered.map((n) => (
            <button key={n} onClick={() => { onPick(n); setOpen(false); }}
              className="w-full text-left px-2 py-1.5 text-xs rounded-button text-text-secondary hover:text-text-primary hover:bg-bg-secondary truncate">{n}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ================= 組建 WorkoutSession =================

function resolveTaxoFromTarget(
  rawName: string,
  t: ExerciseMapTarget | undefined,
  customExAfter: CustomExercise[],
): { exerciseId: string; name: string; muscleGroup?: MuscleGroup; equipmentType?: EquipmentType } {
  if (t && t.kind !== 'new') {
    const tx = resolveCurrentTaxonomy(t.exercise.id, customExAfter, {
      muscleGroup: t.exercise.muscleGroup,
      equipmentType: t.exercise.equipmentType,
      name: t.exercise.name,
    });
    return {
      exerciseId: t.exercise.id,
      name: t.exercise.name,
      muscleGroup: tx.muscleGroup,
      equipmentType: tx.equipmentType,
    };
  }
  // 未對應的最後兜底：用 rawName 建立一筆匿名；這裡不會被用到（Step3 需 mappingComplete）
  return {
    exerciseId: 'builtin-overhead-press',
    name: rawName,
  };
}

function buildSessionFromMatrix(
  ps: MatrixParsedSession,
  targets: Map<string, ExerciseMapTarget>,
  customExAfter: CustomExercise[],
): WorkoutSession {
  const customExercises: CustomExercise[] = customExAfter;
  const exercises: ExerciseLog[] = [];
  let volume = 0;
  for (const pe of ps.exercises) {
    const t = targets.get(pe.name);
    const tx = resolveTaxoFromTarget(pe.name, t, customExercises);
    const sets: SetLog[] = pe.sets.map((x, idx) => {
      const s: SetLog = {
        id: generateId('set'),
        setNumber: idx + 1,
        weight: x.weight,
        reps: x.reps,
        completed: true,
      };
      if (x.isBodyweight) {
        // 架構上無 isBodyweight 欄；依 matrix 規則，notes 附 BW
        // 這裡不重複附，依解析規則 weight = 0 表示 BW；caller 需理解 BW 時 0×reps 體積 0，但 PR 估算會 0
        // 為保險：若 weight 為 0 且 isBodyweight，仍保留 completed=true
      }
      if (s.weight > 0 && s.reps > 0) volume += s.weight * s.reps;
      return s;
    });
    // 為 BW 動作：PR 估以體重估算 1RM 須體重資訊，這裡不計入 volume，但紀錄仍成立
    exercises.push({
      id: generateId('ex'),
      exerciseId: tx.exerciseId,
      name: tx.name,
      muscleGroup: tx.muscleGroup,
      equipmentType: tx.equipmentType,
      sets,
    });
  }
  return {
    id: generateId('session'),
    date: new Date(ps.dateISO).toISOString(),
    warmupCompletedIds: [],
    duration: 0,
    totalVolume: volume,
    exercises,
    startedAt: null,
    finishedAt: null,
    imported: true,
    notes: ps.notes,
  };
}
