import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import Plans from '@/pages/Plans';
import PlanDetail from '@/pages/PlanDetail';
import Workout from '@/pages/Workout';
import WorkoutSummary from '@/pages/WorkoutSummary';
import Progress from '@/pages/Progress';
import Exercises from '@/pages/Exercises';
import ExerciseDetail from '@/pages/ExerciseDetail';
import Settings from '@/pages/Settings';
import { TrialLock } from '@/components/TrialLock';
import { FeedbackModal } from '@/components/FeedbackModal';
import { useTrialStore } from '@/store/trialStore';

function AppContent() {
  const { shouldShowFeedback } = useTrialStore();
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
        <Route path="/" element={<Dashboard />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/plans/:planId" element={<PlanDetail />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/workout/summary" element={<WorkoutSummary />} />
        <Route path="/progress" element={<Progress />} />
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
