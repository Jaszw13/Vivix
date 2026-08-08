import { Component, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import Dashboard from '@/pages/Dashboard';
import Plans from '@/pages/Plans';
import PlanDetail from '@/pages/PlanDetail';
import Workout from '@/pages/Workout';
import WorkoutSummary from '@/pages/WorkoutSummary';
import Progress from '@/pages/Progress';
import Achievements from '@/pages/Achievements';
import Onboarding from '@/pages/Onboarding';
import Exercises from '@/pages/Exercises';
import ExerciseDetail from '@/pages/ExerciseDetail';
import Settings from '@/pages/Settings';
import { TrialLock } from '@/components/TrialLock';
import { FeedbackModal } from '@/components/FeedbackModal';
import { useTrialStore } from '@/store/trialStore';
import { useProfileStore } from '@/store/profileStore';

/**
 * App 級 ErrorBoundary：
 *   React 18 之後，任何 component render 期間 throw 但冇被攔截，
 *   會將最近果個子樹 unmount → 白屏。
 *   ErrorBoundary 就係呢個情況下嘅「最後防線」：
 *   用戶會見到 error 卡 + 一鍵重置按鈕，而唔係完全空白。
 */
class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null; info: React.ErrorInfo | null }
> {
  state = { error: null as Error | null, info: null as React.ErrorInfo | null };
  static getDerivedStateFromError(error: Error) {
    return { error, info: null };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[Vivix] App render error:', error, info?.componentStack);
    this.setState({ info });
  }
  handleReset = () => {
    this.setState({ error: null, info: null });
    // 最可靠：full page reload
    window.location.reload();
  };
  handleClearAll = () => {
    // 全部清 store（last resort，例如 migrate 壞咗）
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('ironpulse-')) localStorage.removeItem(k);
      }
    } catch {}
    window.location.reload();
  };
  render() {
    if (this.state.error) {
      const e = this.state.error;
      return (
        <div className="min-h-screen w-full max-w-[480px] mx-auto bg-bg-primary flex items-stretch px-5 py-10">
          <div className="w-full rounded-[20px] border border-auxiliary/40 bg-bg-card p-5 shadow-card flex flex-col">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-auxiliary/20 text-auxiliary flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl tracking-wide uppercase text-text-primary">
                  出咗少少問題
                </div>
                <p className="text-[11px] text-text-secondary mt-1">
                  Vivix 遇到一個畫面錯誤，請按下面按鈕重試。
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-card bg-bg-secondary border border-border/40">
              <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">
                錯誤摘要
              </div>
              <pre className="text-[11.5px] font-mono text-text-primary whitespace-pre-wrap break-words leading-relaxed">
                {e?.name}: {e?.message || 'Unknown error'}
              </pre>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={this.handleReset}
                className="h-12 bg-accent text-bg-primary rounded-button text-sm font-bold uppercase tracking-wider active:translate-y-px transition-all flex items-center justify-center gap-2"
              >
                <RefreshCcw size={16} /> 重新載入
              </button>
              <button
                onClick={this.handleClearAll}
                className="h-12 bg-bg-secondary rounded-button border-2 border-border text-sm font-bold uppercase tracking-wider text-text-primary active:translate-y-px transition-all"
              >
                重置所有資料
              </button>
            </div>
            <p className="mt-4 text-center text-[10px] text-text-secondary/60 leading-relaxed">
              如果重新載入後仍然出現，請截圖回饋俾開發團隊。
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * 守衛放 component 入面，唔用條件式加減 Route：
 *   避免 onboarding state 切換時，<Route path="/onboarding"> 被即時移除，
 *   但 URL 仲係 /onboarding → 路由冇匹配 → 白屏。
 *   將判斷包喺 component 入面，setState + navigate 發生同一個 render 脈絡，唔會有時間差問題
 */
function OnboardingGuard() {
  const onboardingCompleted = useProfileStore((s) => s.onboardingCompleted);
  if (onboardingCompleted) return <Navigate to="/" replace />;
  return <Onboarding />;
}

function DashboardGuard() {
  const onboardingCompleted = useProfileStore((s) => s.onboardingCompleted);
  if (!onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return <Dashboard />;
}

function AppContent() {
  const { shouldShowFeedback } = useTrialStore();
  // AppContent 唔再需要讀 onboardingCompleted，守衛各自讀取，避免同一 state 變化導致雙重 re-render 干擾路由
  const [showFeedback, setShowFeedback] = useState(false);

  // 啟動時檢查是否需要顯示反饋
  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldShowFeedback()) {
        setShowFeedback(true);
      }
    }, 2000); // 延遲 2 秒，避免一開啟就彈出
    return () => clearTimeout(timer);
  }, [shouldShowFeedback]);

  return (
    <>
      <Routes>
        {/* 所有路由永久存在，守衛邏輯放 component 入面，避免 state 切換瞬間路由缺失導致白屏 */}
        <Route path="/onboarding" element={<OnboardingGuard />} />
        <Route path="/" element={<DashboardGuard />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/plans/:planId" element={<PlanDetail />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/workout/summary" element={<WorkoutSummary />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/exercises/:exerciseId" element={<ExerciseDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <FeedbackModal show={showFeedback} />
    </>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <Router>
        <TrialLock>
          <AppContent />
        </TrialLock>
      </Router>
    </AppErrorBoundary>
  );
}
