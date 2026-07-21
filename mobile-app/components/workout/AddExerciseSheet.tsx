import { useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { X, Plus, Search } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { exercises, exerciseCategories } from '@/data/exercises';
import { CATEGORY_LABELS } from '@/types';
import type { ExerciseCategory } from '@/types';

interface AddExerciseSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exerciseId: string, name: string) => void;
}

export function AddExerciseSheet({ visible, onClose, onSelect }: AddExerciseSheetProps) {
  const { colors } = useThemeStore();
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all');
  const [query, setQuery] = useState('');

  const filtered = exercises.filter((ex) => {
    if (category !== 'all' && ex.category !== category) return false;
    if (query && !ex.name.includes(query)) return false;
    return true;
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderColor,
            paddingTop: 60,
          }}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            選擇動作
          </Text>
          <Pressable onPress={onClose} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <X color={colors.textSecondary} size={20} />
          </Pressable>
        </View>

        {/* 搜尋 */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.bgCard,
              borderRadius: colors.radiusButton,
              borderWidth: 1,
              borderColor: colors.borderColor,
              paddingHorizontal: 12,
              height: 44,
            }}
          >
            <Search color={colors.textSecondary} size={16} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="搜尋動作…"
              placeholderTextColor={colors.textMuted}
              style={{ flex: 1, marginLeft: 8, color: colors.textPrimary, fontSize: 14 }}
            />
          </View>
        </View>

        {/* 分類 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderColor }}
        >
          <CategoryChip
            label="全部"
            active={category === 'all'}
            onPress={() => setCategory('all')}
          />
          {exerciseCategories.map((c) => (
            <CategoryChip
              key={c.value}
              label={CATEGORY_LABELS[c.value]}
              active={category === c.value}
              onPress={() => setCategory(c.value)}
            />
          ))}
        </ScrollView>

        {/* 動作列表 */}
        <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 8 }}>
            {filtered.map((ex) => (
              <TouchableOpacity
                key={ex.id}
                onPress={() => onSelect(ex.id, ex.name)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  backgroundColor: colors.bgCard,
                  borderRadius: colors.radiusButton,
                  borderWidth: 1,
                  borderColor: colors.borderColor + '55',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>{ex.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>
                    {ex.muscleGroup} · {ex.equipment}
                  </Text>
                </View>
                <Plus color={colors.accent} size={18} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  function CategoryChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: colors.radiusButton,
          borderWidth: 1,
          borderColor: active ? colors.accent : colors.borderColor,
          backgroundColor: active ? colors.accent : 'transparent',
          marginRight: 8,
        }}
      >
        <Text
          style={{
            color: active ? colors.bgPrimary : colors.textSecondary,
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }
}
