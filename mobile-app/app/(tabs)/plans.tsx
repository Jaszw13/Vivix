import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Clock } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Card, Badge } from '@/components/ui/Card';
import { trainingPlans } from '@/data/plans';
import { DIFFICULTY_LABELS } from '@/types';
import { useThemeStore } from '@/store/themeStore';

export default function Plans() {
  const router = useRouter();
  const { colors } = useThemeStore();

  return (
    <Screen title="訓練計畫">
      <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 16 }}>
        選擇適合你的力量訓練模板
      </Text>
      <View style={{ gap: 16 }}>
        {trainingPlans.map((plan) => (
          <Pressable key={plan.id} onPress={() => router.push(`/plans/${plan.id}`)}>
            <Card style={{ overflow: 'hidden', padding: 0 }}>
              {/* 封面 */}
              <View
                style={{
                  height: 128,
                  backgroundColor: colors.bgSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <Text style={{ color: colors.accent, fontSize: 56, fontWeight: '700', letterSpacing: 2 }}>
                  {plan.cover}
                </Text>
                <View style={{ position: 'absolute', top: 12, right: 12 }}>
                  <Badge variant={plan.difficulty === 'beginner' ? 'accent' : 'default'}>
                    {DIFFICULTY_LABELS[plan.difficulty]}
                  </Badge>
                </View>
              </View>
              {/* 內容 */}
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                      {plan.name}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                      {plan.description}
                    </Text>
                  </View>
                  <ChevronRight color={colors.textSecondary} size={20} style={{ marginTop: 4 }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderColor + '55' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Clock color={colors.textSecondary} size={12} />
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {plan.days.length} 天 / 週期
                    </Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {plan.days.reduce((s, d) => s + d.exercises.length, 0)} 個動作
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
