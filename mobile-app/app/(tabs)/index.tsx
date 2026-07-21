import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Flame, Plus, TrendingUp, Trophy, Zap } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Card, SectionHeader, StatTile, Badge } from '@/components/ui/Card';
import { useWorkoutStore } from '@/store/workoutStore';
import { useProfileStore } from '@/store/profileStore';
import { trainingPlans } from '@/data/plans';
import { formatDate } from '@/utils/workout';
import { useThemeStore } from '@/store/themeStore';

export default function Dashboard() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const { sessions, personalRecords, getTotalSessions, getTotalVolume, getStreakDays } =
    useWorkoutStore();
  const { profile } = useProfileStore();

  const totalSessions = getTotalSessions();
  const totalVolume = getTotalVolume();
  const streak = getStreakDays();

  const lastSession = sessions[sessions.length - 1];
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? '早安' : hour < 18 ? '午後' : '夜晚';

  const todayWorkout = trainingPlans[1].days[0];

  return (
    <Screen>
      {/* Header */}
      <View style={{ paddingTop: 8, paddingBottom: 16 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          {greeting}，準備好了嗎
        </Text>
        <Text style={{ color: colors.textPrimary, fontSize: 36, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 }}>
          {profile.name}
        </Text>
      </View>

      {/* 今日訓練卡片 */}
      <Card style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
        <View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 3,
            backgroundColor: colors.accent,
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Zap color={colors.accent} size={14} />
              <Text style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                今日訓練
              </Text>
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: 30, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
              {todayWorkout.dayName}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
              {todayWorkout.exercises.length} 個動作 · {todayWorkout.exercises.reduce((s, e) => s + e.targetSets, 0)} 組
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'JetBrains Mono' }}>
              {today.getMonth() + 1}.{today.getDate()}
            </Text>
            <Text style={{ color: colors.accent, fontSize: 24, fontWeight: '700', marginTop: 4 }}>
              {today.toLocaleDateString('zh-TW', { weekday: 'short' })}
            </Text>
          </View>
        </View>
        <Button fullWidth size="lg" title="開始訓練" onPress={() => router.push('/workout')}>
          <TrendingUp color={colors.bgPrimary} size={18} />
          <Text style={{ color: colors.bgPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            開始訓練
          </Text>
        </Button>
      </Card>

      {/* 累積數據 */}
      <View style={{ marginTop: 24 }}>
        <SectionHeader title="累積數據" subtitle="你的訓練足跡" />
        <Card style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <StatTile label="訓練次數" value={totalSessions} />
          </View>
          <View style={{ width: 1, backgroundColor: colors.borderColor + '55' }} />
          <View style={{ flex: 1 }}>
            <StatTile label="總噸數" value={totalVolume} unit="t" />
          </View>
          <View style={{ width: 1, backgroundColor: colors.borderColor + '55' }} />
          <View style={{ flex: 1 }}>
            <StatTile label="連續天數" value={streak} unit="天" highlight={streak > 0} />
          </View>
        </Card>
      </View>

      {/* 個人紀錄 */}
      <View style={{ marginTop: 24 }}>
        <SectionHeader
          title="個人紀錄"
          subtitle="三大項最佳表現"
          action={
            <Pressable onPress={() => router.push('/progress')}>
              <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                全部 →
              </Text>
            </Pressable>
          }
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12, paddingBottom: 4 }}>
            {personalRecords.slice(0, 5).map((pr) => (
              <Card key={pr.exerciseId} style={{ width: 144, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Trophy color={colors.auxiliary} size={16} />
                  <Badge variant="auxiliary">PR</Badge>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }} numberOfLines={1}>
                  {pr.exerciseName}
                </Text>
                <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                  {pr.weight}
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}> kg</Text>
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'JetBrains Mono', marginTop: 4 }}>
                  × {pr.reps} reps
                </Text>
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderColor + '55' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    估算 1RM
                  </Text>
                  <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                    {pr.estimated1RM} kg
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 上次訓練 */}
      {lastSession ? (
        <View style={{ marginTop: 24 }}>
          <SectionHeader title="上次訓練" />
          <Card style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  {lastSession.dayName ?? '訓練'}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {lastSession.planName} · {formatDate(lastSession.date)}
                </Text>
              </View>
              <Flame color={colors.auxiliary} size={20} />
            </View>
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  訓練量
                </Text>
                <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                  {(lastSession.totalVolume / 1000).toFixed(1)}
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}> t</Text>
                </Text>
              </View>
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  動作數
                </Text>
                <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                  {lastSession.exercises.length}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      ) : null}

      {/* 快速開始 */}
      <View style={{ marginTop: 24 }}>
        <SectionHeader title="快速開始" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => router.push('/plans')}
            style={{
              flex: 1,
              backgroundColor: colors.bgCard,
              borderRadius: colors.radiusCard,
              borderWidth: 1,
              borderColor: colors.borderColor + '55',
              padding: 16,
            }}
          >
            <Plus color={colors.accent} size={20} />
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 8 }}>選擇計畫</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>從模板開始</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/workout')}
            style={{
              flex: 1,
              backgroundColor: colors.bgCard,
              borderRadius: colors.radiusCard,
              borderWidth: 1,
              borderColor: colors.borderColor + '55',
              padding: 16,
            }}
          >
            <Plus color={colors.auxiliary} size={20} />
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 8 }}>自由訓練</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>空白開始</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
