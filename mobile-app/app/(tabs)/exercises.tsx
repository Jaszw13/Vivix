import { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { Search, ChevronRight, Dumbbell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/layout/Screen';
import { Card, Badge } from '@/components/ui/Card';
import { exercises, exerciseCategories } from '@/data/exercises';
import { CATEGORY_LABELS, type ExerciseCategory } from '@/types';
import { useThemeStore } from '@/store/themeStore';
import { useWorkoutStore } from '@/store/workoutStore';

type Filter = ExerciseCategory | 'all';

export default function ExercisesPage() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const { personalRecords } = useWorkoutStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesCategory = filter === 'all' || ex.category === filter;
      const matchesQuery =
        query.trim() === '' ||
        ex.name.toLowerCase().includes(query.toLowerCase()) ||
        ex.muscleGroup.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [query, filter]);

  const getPR = (exerciseId: string) =>
    personalRecords.find((p) => p.exerciseId === exerciseId);

  return (
    <Screen title="動作資料庫">
      {/* 搜尋 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: colors.bgCard,
          borderRadius: colors.radiusButton,
          borderWidth: 1,
          borderColor: colors.borderColor,
          paddingHorizontal: 12,
          marginBottom: 12,
        }}
      >
        <Search color={colors.textSecondary} size={16} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜尋動作或肌群…"
          placeholderTextColor={colors.textMuted}
          style={{
            flex: 1,
            color: colors.textPrimary,
            fontSize: 14,
            paddingVertical: 12,
          }}
          returnKeyType="search"
        />
      </View>

      {/* 分類篩選 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16, paddingHorizontal: 16, marginBottom: 12 }}
      >
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={() => setFilter('all')}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 4,
              backgroundColor: filter === 'all' ? colors.accent : colors.bgSecondary,
            }}
          >
            <Text
              style={{
                color: filter === 'all' ? colors.bgPrimary : colors.textSecondary,
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              全部
            </Text>
          </Pressable>
          {exerciseCategories.map((cat) => (
            <Pressable
              key={cat.value}
              onPress={() => setFilter(cat.value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 4,
                backgroundColor: filter === cat.value ? colors.accent : colors.bgSecondary,
              }}
            >
              <Text
                style={{
                  color: filter === cat.value ? colors.bgPrimary : colors.textSecondary,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* 動作列表 */}
      {filtered.length > 0 ? (
        <View style={{ gap: 8 }}>
          {filtered.map((ex) => {
            const pr = getPR(ex.id);
            return (
              <Pressable key={ex.id} onPress={() => router.push(`/exercises/${ex.id}`)}>
                <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: colors.radiusButton,
                      backgroundColor: colors.accentSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Dumbbell color={colors.accent} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <Badge>{CATEGORY_LABELS[ex.category]}</Badge>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
                      {ex.muscleGroup} · {ex.equipment}
                    </Text>
                  </View>
                  {pr ? (
                    <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                      <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
                        {pr.estimated1RM}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                        PR kg
                      </Text>
                    </View>
                  ) : null}
                  <ChevronRight color={colors.textMuted} size={16} />
                </Card>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>找不到符合的動作</Text>
        </View>
      )}
    </Screen>
  );
}
