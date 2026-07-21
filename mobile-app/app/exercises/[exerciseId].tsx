import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Dumbbell, Trophy, TrendingUp, Plus, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card, Badge, SectionHeader } from '@/components/ui/Card';
import { getExerciseById } from '@/data/exercises';
import { CATEGORY_LABELS } from '@/types';
import { useThemeStore } from '@/store/themeStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { formatDateFull } from '@/utils/workout';

export default function ExerciseDetailPage() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeStore();
  const exercise = exerciseId ? getExerciseById(exerciseId) : undefined;
  const { personalRecords, sessions, addExerciseToActive, activeSession } = useWorkoutStore();

  if (!exercise) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>找不到此動作</Text>
      </View>
    );
  }

  const pr = personalRecords.find((p) => p.exerciseId === exercise.id);
  const history = sessions
    .filter((s) => s.exercises.some((e) => e.exerciseId === exercise.id))
    .slice(-8)
    .reverse();

  const handleAddToWorkout = () => {
    if (!activeSession) {
      Alert.alert(
        '尚未開始訓練',
        '請先開始一次訓練，再將動作加入。',
        [
          { text: '取消', style: 'cancel' },
          { text: '開始訓練', onPress: () => router.push('/workout') },
        ]
      );
      return;
    }
    addExerciseToActive({
      id: `pe-${Date.now()}`,
      exerciseId: exercise.id,
      name: exercise.name,
      targetSets: 3,
      targetReps: '8-12',
    });
    Alert.alert('已加入', `「${exercise.name}」已加入目前訓練`, [
      { text: '繼續瀏覽', style: 'cancel' },
      { text: '前往訓練', onPress: () => router.push('/workout') },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderColor,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}
          >
            <ChevronLeft color={colors.textPrimary} size={24} strokeWidth={2.5} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Badge>{CATEGORY_LABELS[exercise.category]}</Badge>
              <Text style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {exercise.equipment}
              </Text>
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
              {exercise.name}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
              {exercise.muscleGroup}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* PR 卡片 */}
        {pr ? (
          <View style={{ marginBottom: 24 }}>
            <SectionHeader title="個人紀錄" />
            <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: colors.radiusButton,
                  backgroundColor: colors.auxiliary + '26',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trophy color={colors.auxiliary} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  最佳表現
                </Text>
                <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                  {pr.weight}
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}> kg × </Text>
                  {pr.reps}
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}> reps</Text>
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                  {formatDateFull(pr.date)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.accent, fontSize: 24, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                  {pr.estimated1RM}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  1RM kg
                </Text>
              </View>
            </Card>
          </View>
        ) : null}

        {/* 動作說明 */}
        <View style={{ marginBottom: 24 }}>
          <SectionHeader title="動作步驟" />
          <Card style={{ padding: 16 }}>
            <View style={{ gap: 12 }}>
              {exercise.instructions.map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      backgroundColor: colors.accentSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, flex: 1, lineHeight: 20 }}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* 訓練提示 */}
        <View style={{ marginBottom: 24 }}>
          <SectionHeader title="訓練提示" />
          <Card style={{ padding: 16 }}>
            <View style={{ gap: 10 }}>
              {exercise.tips.map((tip, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <Info color={colors.accent} size={14} style={{ marginTop: 2 }} />
                  <Text style={{ color: colors.textPrimary, fontSize: 13, flex: 1, lineHeight: 18 }}>
                    {tip}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* 歷史記錄 */}
        {history.length > 0 ? (
          <View style={{ marginBottom: 24 }}>
            <SectionHeader title="歷史記錄" subtitle={`最近 ${history.length} 次`} />
            <Card style={{ padding: 0 }}>
              {history.map((s, i) => {
                const ex = s.exercises.find((e) => e.exerciseId === exercise.id);
                const completed = ex?.sets.filter((set) => set.completed) ?? [];
                const maxSet = completed.reduce(
                  (m, s) => (s.weight > m.weight ? s : m),
                  completed[0] ?? { weight: 0, reps: 0 }
                );
                const volume = completed.reduce((sum, set) => sum + set.weight * set.reps, 0);
                return (
                  <View
                    key={s.id}
                    style={{
                      padding: 12,
                      borderBottomWidth: i === history.length - 1 ? 0 : 1,
                      borderBottomColor: colors.borderColor + '40',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                          {formatDateFull(s.date)}
                        </Text>
                        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: 'JetBrains Mono', marginTop: 4 }}>
                          {maxSet.weight} kg × {maxSet.reps} reps
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                          {volume} kg
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>
                          {completed.length} 組
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </Card>
          </View>
        ) : null}
      </ScrollView>

      {/* 底部按鈕 */}
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
        <Button fullWidth size="lg" onPress={handleAddToWorkout}>
          <Plus color={colors.bgPrimary} size={18} />
          <Text style={{ color: colors.bgPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            加入訓練
          </Text>
        </Button>
      </View>
    </View>
  );
}
