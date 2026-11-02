import { Activity, Coffee, Lock, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TrialRedeemPanel } from '@/components/TrialLock';
import { weightHintLabel, type ProposeSessionResult } from '@/domain/coach/proposeSession';
import type { RestDayEntry } from '@/types';
import { ACTIVITY_LABEL } from '@/store/restDayStore';

export function TodayDecisionCard({
  planName,
  dayName,
  exerciseCount,
  setCount,
  dateLabel,
  weekdayLabel,
  sessionMinutes,
  weeklyDays,
  proposal,
  names,
  locked,
  onStart,
  microDone,
  onMicro,
  onCardio,
  onRest,
  todayRest,
  onDeleteRest,
}: {
  planName: string;
  dayName: string;
  exerciseCount: number;
  setCount: number;
  dateLabel: string;
  weekdayLabel: string;
  sessionMinutes: number;
  weeklyDays: number;
  proposal: ProposeSessionResult;
  names: Record<string, string>;
  locked: boolean;
  onStart: () => void;
  microDone: boolean;
  onMicro: () => void;
  onCardio: () => void;
  onRest: () => void;
  todayRest: RestDayEntry | null;
  onDeleteRest: () => void;
}) {
  return (
    <Card className="relative overflow-hidden p-5 mb-4">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent to-auxiliary" />
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={14} className="text-accent" />
            <span className="text-[10px] uppercase tracking-widest text-text-secondary">
              {locked ? '今日點練' : `今日點練 · ${planName}`}
            </span>
          </div>
          <h2 className="font-display text-3xl tracking-wide uppercase text-text-primary">
            {locked ? '先看你的紀錄' : dayName}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {locked
              ? '建議先鎖住。進度同舊訓練還在。'
              : `每週 ${weeklyDays} 天 · 約 ${sessionMinutes} 分鐘 · ${exerciseCount} 個動作 · ${setCount} 組`}
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs text-text-secondary">{dateLabel}</div>
          <div className="font-display text-2xl text-accent mt-1">{weekdayLabel}</div>
        </div>
      </div>

      {locked ? (
        <div className="mb-3">
          <div className="flex items-start gap-2 mb-3">
            <Lock size={16} className="text-accent mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-text-secondary leading-snug">
              今日點練暫時鎖住。進度、舊訓練紀錄仍然可以看，不會被收起來。
            </p>
          </div>
          <TrialRedeemPanel />
        </div>
      ) : proposal.status === 'empty' ? (
        <p className="text-[12px] text-text-secondary leading-snug mb-3">
          以你現在的器材和少練偏好，這一課沒有可排的動作。到設定放寬一點，或換一天。
        </p>
      ) : (
        <div className="flex flex-col gap-2 mb-3">
          {proposal.exercises.map((item) => (
            <div
              key={`${item.via}-${item.exerciseId}`}
              className="flex items-center justify-between gap-3 rounded-button bg-bg-secondary px-3 py-2 border border-border/30"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-text-primary truncate">
                  {names[item.exerciseId] ?? item.exerciseId}
                </div>
                {item.via === 'alternative' && (
                  <div className="text-[10px] text-text-secondary">依器材或少練偏好替換</div>
                )}
              </div>
              <div className="text-[11px] font-mono text-accent text-right flex-shrink-0">
                {weightHintLabel(item.weight)}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-text-secondary/80">
            上次重量和疲勞區間只供參考，不會寫進這一組。
          </p>
        </div>
      )}

      {!locked && proposal.status === 'ready' && (
        <>
          <Button fullWidth size="lg" onClick={onStart}>
            <TrendingUp size={18} /> 開始訓練
          </Button>
          {microDone ? (
            <div className="mt-2 rounded-button border border-accent/40 bg-accent/10 px-3 py-2 text-center text-[11px] font-bold text-accent">
              已記錄今天的一組，這週的目標又靠近一步。
            </div>
          ) : (
            <Button
              fullWidth
              size="sm"
              variant="ghost"
              className="mt-2 border border-border/40"
              onClick={onMicro}
            >
              <Zap size={16} /> 今天只做一組（30 秒）
            </Button>
          )}
        </>
      )}

      <Button
        fullWidth
        size="sm"
        variant="ghost"
        className="mt-2 border border-border/40"
        onClick={onCardio}
      >
        <Activity size={16} /> 記錄有氧
      </Button>

      {todayRest ? (
        <div className="mt-2 flex items-center justify-between rounded-button border border-accent/30 bg-accent/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <Coffee size={16} className="text-accent" />
            <span className="text-sm font-bold text-accent">今天：休息日</span>
            {todayRest.activity && (
              <span className="text-[10px] text-text-secondary">
                {ACTIVITY_LABEL[todayRest.activity]}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onDeleteRest}
            className="text-[10px] text-text-secondary hover:text-accent transition-colors"
          >
            刪除
          </button>
        </div>
      ) : (
        <Button
          fullWidth
          size="sm"
          variant="ghost"
          className="mt-2 border border-border/40"
          onClick={onRest}
        >
          <Coffee size={16} /> 記錄休息日
        </Button>
      )}
    </Card>
  );
}
