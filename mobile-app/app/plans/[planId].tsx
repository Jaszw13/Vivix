import { View, Text, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Play, ChevronLeft, Dumbbell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Card, Badge, SectionHeader } from '@/components/ui/Card';
import { getPlanById } from '@/data/plans';
import { useWorkoutStore } from '@/store/workoutStore';
import { DIFFICULTY_LABELS } from '@/types';
import { useThemeStore } from '@/store/themeStore';

export default function PlanDetail() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeStore();
  const plan = planId ? getPlanById(planId) : undefined;
  const startSession = useWorkoutStore((s) => s.startSession);

  if (!plan) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>找不到此訓練計畫</Text>
      </View>
    );
  }

  const handleStart = (dayId: string) => {
    const day = plan.days.find((d) => d.id === dayId);
    if (!day) return;
    startSession(plan.id, plan.name, day);
    router.push('/workout');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      {/* 封面 */}
      <View
        style={{
          height: 176,
          backgroundColor: colors.bgSecondary,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top,
        }}
      >
        <Text style={{ color: colors.accent, fontSize: 72, fontWeight: '700', letterSpacing: 2 }}>
          {plan.cover}
        </Text>
        <View style={{ position: 'absolute', top: insets.top + 12, right: 16 }}>
          <Badge variant={plan.difficulty === 'beginner' ? 'accent' : 'default'}>
            {DIFFICULTY_LABELS[plan.difficulty]}
          </Badge>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 12,
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft color={colors.textPrimary} size={24} strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 20 }}>
          {plan.description}
        </Text>

        <SectionHeader title="訓練日" subtitle={`${plan.days.length} 天排程`} />
        <View style={{ gap: 16 }}>
          {plan.days.map((day) => (
            <Card key={day.id} style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    Day {day.dayIndex + 1}
                  </Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                    {day.dayName}
                  </Text>
                </View>
                <Button size="sm" onPress={() => handleStart(day.id)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Play color={colors.bgPrimary} size={14} fill={colors.bgPrimary} />
                    <Text style={{ color: colors.bgPrimary, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>開始</Text>
                  </View>
                </Button>
              </View>
              <View style={{ gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderColor + '55' }}>
                {day.exercises.map((ex) => (
                  <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: colors.radiusButton,
                        backgroundColor: colors.accentSoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Dumbbell color={colors.accent} size={13} />
                    </View>
                    <Text style={{ color: colors.textPrimary, fontSize: 14, flex: 1 }} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                      {ex.targetSets}×{ex.targetReps}
                      {ex.targetWeight ? ` · ${ex.targetWeight}kg` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
