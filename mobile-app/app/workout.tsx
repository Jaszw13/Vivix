import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Plus, Timer, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ExerciseSetList } from '@/components/workout/ExerciseSetList';
import { RestTimer } from '@/components/workout/RestTimer';
import { AddExerciseSheet } from '@/components/workout/AddExerciseSheet';
import { useWorkoutStore } from '@/store/workoutStore';
import { formatDuration } from '@/utils/workout';
import { useThemeStore } from '@/store/themeStore';

export default function WorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeStore();
  const { activeSession, startEmptySession, finishSession, clearActiveSession } =
    useWorkoutStore();
  const [showTimer, setShowTimer] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showAddExercise, setShowAddExercise] = useState(false);

  // 若無進行中訓練，自動建立空白 session
  useEffect(() => {
    if (!activeSession) {
      startEmptySession();
    }
  }, [activeSession, startEmptySession]);

  // 計時
  useEffect(() => {
    if (!activeSession) return;
    const startTime = new Date(activeSession.date).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  if (!activeSession) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>載入中…</Text>
      </View>
    );
  }

  const handleFinish = () => {
    const finished = finishSession();
    if (finished) {
      router.replace('/workout/summary');
    }
  };

  const handleExit = () => {
    Alert.alert('放棄這次訓練？', '記錄將不會儲存。', [
      { text: '取消', style: 'cancel' },
      {
        text: '放棄',
        style: 'destructive',
        onPress: () => {
          clearActiveSession();
          router.dismiss();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderColor,
        }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
          訓練中
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: colors.accent, fontSize: 14, fontFamily: 'JetBrains Mono' }}>
            {formatDuration(elapsed)}
          </Text>
          <Pressable onPress={handleExit} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <X color={colors.textSecondary} size={22} />
          </Pressable>
        </View>
      </View>

      {/* 內容 */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 訓練資訊 */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {activeSession.planName ?? '自由訓練'}
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 }}>
            {activeSession.dayName ?? '今日訓練'}
          </Text>
        </View>

        {/* 動作列表 */}
        <View style={{ gap: 12 }}>
          {activeSession.exercises.map((ex) => (
            <ExerciseSetList
              key={ex.id}
              exercise={ex}
              onSetCompleted={() => setShowTimer(true)}
            />
          ))}

          {activeSession.exercises.length === 0 ? (
            <Card style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 16 }}>
                尚未加入任何動作
              </Text>
              <Button onPress={() => setShowAddExercise(true)} title="新增動作" />
            </Card>
          ) : null}
        </View>
      </ScrollView>

      {/* 底部操作 */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.bgPrimary,
          borderTopWidth: 1,
          borderTopColor: colors.borderColor + '55',
        }}
      >
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button variant="secondary" size="lg" onPress={() => setShowAddExercise(true)}>
            <Plus color={colors.accent} size={18} />
          </Button>
          <Button variant="secondary" size="lg" onPress={() => setShowTimer(true)}>
            <Timer color={colors.accent} size={18} />
          </Button>
          <Button size="lg" fullWidth onPress={handleFinish} title="完成訓練" />
        </View>
      </View>

      {/* 休息計時器 */}
      <RestTimer visible={showTimer} onClose={() => setShowTimer(false)} />

      {/* 新增動作 */}
      <AddExerciseSheet
        visible={showAddExercise}
        onClose={() => setShowAddExercise(false)}
        onSelect={(exerciseId, name) => {
          useWorkoutStore.getState().addExerciseToActive({
            id: `pe-${Date.now()}`,
            exerciseId,
            name,
            targetSets: 3,
            targetReps: '8-12',
          });
          setShowAddExercise(false);
        }}
      />
    </View>
  );
}
