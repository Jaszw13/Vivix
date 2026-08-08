import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
    <Router>
      <TrialLock>
        <AppContent />
      </TrialLock>
    </Router>
  );
}
