import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Trophy, TrendingUp, Activity, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Card, SectionHeader } from '@/components/ui/Card';
import { useWorkoutStore } from '@/store/workoutStore';
import { useThemeStore } from '@/store/themeStore';
import { exercises } from '@/data/exercises';
import { CATEGORY_LABELS, type ExerciseCategory } from '@/types';
import { formatDateFull } from '@/utils/workout';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 32; // padding 16 on each side
const CHART_HEIGHT = 200;

export default function ProgressPage() {
  const router = useRouter();
  const { colors, theme } = useThemeStore();
  const { personalRecords, sessions, getExerciseProgress, getWeeklyVolume } =
    useWorkoutStore();
  const [selectedExerciseId, setSelectedExerciseId] = useState('squat');

  // 週訓練量
  const weeklyVolume = useMemo(() => getWeeklyVolume(), [sessions]);

  // 動作進度
  const exerciseProgress = useMemo(
    () => getExerciseProgress(selectedExerciseId),
    [sessions, selectedExerciseId]
  );

  // 部位分佈
  const bodyPartDistribution = useMemo(() => {
    const map = new Map<ExerciseCategory, number>();
    for (const s of sessions) {
      for (const ex of s.exercises) {
        const exercise = exercises.find((e) => e.id === ex.exerciseId);
        if (!exercise) continue;
        const vol = ex.sets
          .filter((set) => set.completed)
          .reduce((sum, set) => sum + set.weight * set.reps, 0);
        map.set(exercise.category, (map.get(exercise.category) ?? 0) + vol);
      }
    }
    const palette = [
      colors.accent,
      colors.auxiliary,
      colors.dataColor,
      '#9C7BFF',
      '#4A90E2',
      '#7ED321',
    ];
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, volume], i) => ({
        name: CATEGORY_LABELS[category],
        population: Math.round(volume / 1000),
        color: palette[i % palette.length],
        legendFontColor: colors.textSecondary,
        legendFontSize: 11,
      }));
  }, [sessions, colors]);

  const hasProgressData = exerciseProgress.length > 0;
  const hasWeeklyData = weeklyVolume.length > 0;
  const hasBodyPartData = bodyPartDistribution.length > 0;

  const chartConfig = {
    backgroundGradientFrom: colors.bgCard,
    backgroundGradientTo: colors.bgCard,
    color: () => colors.accent,
    labelColor: () => colors.textSecondary,
    strokeWidth: 2,
    barPercentage: 0.6,
    propsForBackgroundLines: {
      stroke: colors.borderColor,
      strokeOpacity: 0.4,
      strokeDasharray: ['4', '4'],
    },
    propsForLabels: {
      fontSize: 10,
      fontFamily: 'JetBrains Mono',
    },
    fillShadowProps: {
      gradientFrom: colors.accent,
      gradientTo: colors.bgCard,
      gradientFromOpacity: 0.25,
      gradientToOpacity: 0,
    },
  };

  return (
    <Screen title="進度追蹤">
      {/* 個人紀錄列表 */}
      <View style={{ marginBottom: 24 }}>
        <SectionHeader
          title="個人紀錄"
          subtitle="所有動作的 1RM 排行"
        />
        <View style={{ gap: 8 }}>
          {personalRecords.slice(0, 8).map((pr, i) => (
            <Pressable
              key={pr.exerciseId}
              onPress={() => {
                setSelectedExerciseId(pr.exerciseId);
                router.push('/exercises/' + pr.exerciseId);
              }}
            >
              <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: colors.radiusButton,
                    backgroundColor: i === 0 ? colors.accent + '26' : colors.bgSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: i === 0 ? colors.accent : colors.textSecondary,
                      fontSize: 13,
                      fontWeight: '700',
                      fontFamily: 'JetBrains Mono',
                    }}
                  >
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                    {pr.exerciseName}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                    {pr.weight} kg × {pr.reps} reps
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.accent, fontSize: 18, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                    {pr.estimated1RM}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 2 }}>
                    1RM kg
                  </Text>
                </View>
                <ChevronRight color={colors.textMuted} size={16} />
              </Card>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 週訓練量 */}
      <View style={{ marginBottom: 24 }}>
        <SectionHeader title="週訓練量" subtitle="近 8 週累積噸數" />
        <Card style={{ padding: 12 }}>
          {hasWeeklyData ? (
            <BarChart
              data={{
                labels: weeklyVolume.map((w) => w.week),
                datasets: [{ data: weeklyVolume.map((w) => w.volume) }],
              }}
              width={CHART_WIDTH - 24}
              height={CHART_HEIGHT}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={chartConfig}
              withInnerLines
              withVerticalLabels
              withHorizontalLabels
              fromZero
              showBarTops={false}
              style={{ borderRadius: colors.radiusCard }}
            />
          ) : (
            <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>暫無訓練資料</Text>
            </View>
          )}
        </Card>
      </View>

      {/* 動作重量曲線 */}
      <View style={{ marginBottom: 24 }}>
        <SectionHeader
          title="動作重量曲線"
          subtitle="估算 1RM 進展"
        />
        <Card style={{ padding: 12 }}>
          {/* 動作選擇 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {personalRecords.slice(0, 6).map((pr) => (
                <Pressable
                  key={pr.exerciseId}
                  onPress={() => setSelectedExerciseId(pr.exerciseId)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 4,
                    backgroundColor:
                      selectedExerciseId === pr.exerciseId
                        ? colors.accent
                        : colors.bgSecondary,
                  }}
                >
                  <Text
                    style={{
                      color:
                        selectedExerciseId === pr.exerciseId
                          ? colors.bgPrimary
                          : colors.textSecondary,
                      fontSize: 11,
                      fontWeight: '700',
                      letterSpacing: 1,
                    }}
                  >
                    {pr.exerciseName}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {hasProgressData ? (
            <LineChart
              data={{
                labels: exerciseProgress.map((p) => {
                  const d = new Date(p.date);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }),
                datasets: [
                  {
                    data: exerciseProgress.map((p) => p.estimated1RM),
                    color: () => colors.accent,
                    strokeWidth: 2,
                  },
                  {
                    data: exerciseProgress.map((p) => p.maxWeight),
                    color: () => colors.auxiliary,
                    strokeWidth: 1.5,
                  },
                ],
                legend: ['1RM', '最大重量'],
              }}
              width={CHART_WIDTH - 24}
              height={CHART_HEIGHT}
              chartConfig={chartConfig}
              withShadow={false}
              withInnerLines
              withDots
              withOuterLines={false}
              style={{ borderRadius: colors.radiusCard, marginVertical: 8 }}
            />
          ) : (
            <View style={{ height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>該動作尚無記錄</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderColor + '55' }}>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                起點
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                {hasProgressData ? exerciseProgress[0].estimated1RM + ' kg' : '—'}
              </Text>
            </View>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                目前
              </Text>
              <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                {hasProgressData ? exerciseProgress[exerciseProgress.length - 1].estimated1RM + ' kg' : '—'}
              </Text>
            </View>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                增量
              </Text>
              <Text
                style={{
                  color: hasProgressData && exerciseProgress[exerciseProgress.length - 1].estimated1RM > exerciseProgress[0].estimated1RM
                    ? colors.accent
                    : colors.textSecondary,
                  fontSize: 14,
                  fontWeight: '700',
                  fontFamily: 'JetBrains Mono',
                }}
              >
                {hasProgressData
                  ? (exerciseProgress[exerciseProgress.length - 1].estimated1RM - exerciseProgress[0].estimated1RM >= 0 ? '+' : '') +
                    (exerciseProgress[exerciseProgress.length - 1].estimated1RM - exerciseProgress[0].estimated1RM) +
                    ' kg'
                  : '—'}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* 部位分佈 */}
      <View style={{ marginBottom: 24 }}>
        <SectionHeader title="部位分佈" subtitle="累積訓練量比例" />
        <Card style={{ padding: 12 }}>
          {hasBodyPartData ? (
            <PieChart
              data={bodyPartDistribution}
              width={CHART_WIDTH - 24}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="8"
              hasLegend
              absolute
              center={[20, 0]}
            />
          ) : (
            <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>暫無訓練資料</Text>
            </View>
          )}
        </Card>
      </View>

      {/* 訓練總覽 */}
      <View style={{ marginBottom: 24 }}>
        <SectionHeader title="訓練總覽" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Card style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <Activity color={colors.accent} size={16} />
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', fontFamily: 'JetBrains Mono', marginTop: 6 }}>
              {sessions.length}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 }}>
              總次數
            </Text>
          </Card>
          <Card style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <Trophy color={colors.auxiliary} size={16} />
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', fontFamily: 'JetBrains Mono', marginTop: 6 }}>
              {personalRecords.length}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 }}>
              PR 數
            </Text>
          </Card>
          <Card style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <TrendingUp color={colors.accent} size={16} />
            <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', fontFamily: 'JetBrains Mono', marginTop: 6 }}>
              {Math.round(sessions.reduce((s, sess) => s + sess.totalVolume, 0) / 1000)}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 }}>
              總噸數 t
            </Text>
          </Card>
        </View>
      </View>

      {/* 最近訓練記錄 */}
      <View style={{ marginBottom: 24 }}>
        <SectionHeader title="最近訓練" />
        <View style={{ gap: 6 }}>
          {sessions.slice(-5).reverse().map((s) => (
            <Card key={s.id} style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                    {s.dayName ?? s.planName ?? '自由訓練'}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                    {formatDateFull(s.date)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                    {(s.totalVolume / 1000).toFixed(1)} t
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                    {s.exercises.length} 動作
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}
