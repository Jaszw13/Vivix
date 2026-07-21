import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Trophy, TrendingUp, Flame, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card, SectionHeader } from '@/components/ui/Card';
import { useWorkoutStore } from '@/store/workoutStore';
import { estimate1RM, formatDateFull } from '@/utils/workout';
import { useThemeStore } from '@/store/themeStore';

export default function WorkoutSummary() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeStore();
  const session = useWorkoutStore((s) => s.lastFinishedSession);

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>找不到訓練記錄</Text>
      </View>
    );
  }

  const totalVolume = session.totalVolume;
  const totalSets = session.exercises.reduce(
    (s, e) => s + e.sets.filter((set) => set.completed).length,
    0
  );
  const topLifts = session.exercises
    .flatMap((ex) =>
      ex.sets
        .filter((s) => s.completed)
        .map((s) => ({
          name: ex.name,
          weight: s.weight,
          reps: s.reps,
          e1rm: estimate1RM(s.weight, s.reps),
        }))
    )
    .sort((a, b) => b.e1rm - a.e1rm)
    .slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 40, paddingHorizontal: 16, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 大標 */}
        <View style={{ alignItems: 'center', paddingBottom: 24 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Check color={colors.bgPrimary} size={32} strokeWidth={3} />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            {formatDateFull(session.date)}
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: 48, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 }}>
            訓練完成
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>
            {session.dayName ?? session.planName ?? '自由訓練'}
          </Text>
        </View>

        {/* 三大指標 */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <Card style={{ flex: 1, padding: 16, alignItems: 'center' }}>
            <Flame color={colors.auxiliary} size={18} />
            <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '700', fontFamily: 'JetBrains Mono', marginTop: 8 }}>
              {(totalVolume / 1000).toFixed(1)}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>
              噸數 t
            </Text>
          </Card>
          <Card style={{ flex: 1, padding: 16, alignItems: 'center' }}>
            <Check color={colors.accent} size={18} />
            <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '700', fontFamily: 'JetBrains Mono', marginTop: 8 }}>
              {totalSets}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>
              完成組數
            </Text>
          </Card>
          <Card style={{ flex: 1, padding: 16, alignItems: 'center' }}>
            <TrendingUp color={colors.accent} size={18} />
            <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '700', fontFamily: 'JetBrains Mono', marginTop: 8 }}>
              {session.exercises.length}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>
              動作數
            </Text>
          </Card>
        </View>

        {/* 最佳舉起 */}
        {topLifts.length > 0 ? (
          <View style={{ marginBottom: 24 }}>
            <SectionHeader title="最佳表現" subtitle="估算 1RM 排行" />
            <View style={{ gap: 8 }}>
              {topLifts.map((lift, i) => (
                <Card key={i} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: colors.radiusButton,
                      backgroundColor: colors.auxiliary + '26',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.auxiliary, fontSize: 14, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>{lift.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                      {lift.weight} kg × {lift.reps} reps
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.accent, fontSize: 18, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                      {lift.e1rm}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                      1RM kg
                    </Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        ) : null}

        {/* 動作摘要 */}
        <View style={{ marginBottom: 24 }}>
          <SectionHeader title="動作摘要" />
          <Card style={{ padding: 0 }}>
            {session.exercises.map((ex, i) => {
              const completed = ex.sets.filter((s) => s.completed);
              const max = completed.reduce(
                (m, s) => (s.weight > m.weight ? s : m),
                completed[0] ?? { weight: 0, reps: 0 }
              );
              const volume = completed.reduce((s, set) => s + set.weight * set.reps, 0);
              return (
                <View
                  key={ex.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderBottomWidth: i === session.exercises.length - 1 ? 0 : 1,
                    borderBottomColor: colors.borderColor + '40',
                  }}
                >
                  <Trophy color={colors.textSecondary} size={14} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 14 }} numberOfLines={1}>{ex.name}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 10, fontFamily: 'JetBrains Mono' }}>
                      {completed.length} 組 · 最高 {max.weight}kg
                    </Text>
                  </View>
                  <Text style={{ color: colors.accent, fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                    {volume} kg
                  </Text>
                </View>
              );
            })}
          </Card>
        </View>
      </ScrollView>

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
        <Button
          fullWidth
          size="lg"
          onPress={() => {
            useWorkoutStore.getState().clearLastFinished();
            router.replace('/');
          }}
        >
          <Text style={{ color: colors.bgPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            返回主控台
          </Text>
        </Button>
      </View>
    </View>
  );
}
