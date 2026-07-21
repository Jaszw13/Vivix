import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { Check, Minus, Plus, Trash2 } from 'lucide-react-native';
import type { ExerciseLog } from '@/types';
import { useWorkoutStore } from '@/store/workoutStore';
import { Card } from '@/components/ui/Card';
import { useThemeStore } from '@/store/themeStore';

interface SetListProps {
  exercise: ExerciseLog;
  onSetCompleted?: () => void;
}

export function ExerciseSetList({ exercise, onSetCompleted }: SetListProps) {
  const { colors } = useThemeStore();
  const { updateSet, addSet, toggleSetCompleted, removeExercise } = useWorkoutStore();

  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const totalVolume = exercise.sets
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + s.weight * s.reps, 0);

  return (
    <Card style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {exercise.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {completedCount}/{exercise.sets.length} 組完成
            </Text>
            {totalVolume > 0 ? (
              <Text style={{ color: colors.accent, fontSize: 10, fontFamily: 'JetBrains Mono' }}>
                {totalVolume} kg
              </Text>
            ) : null}
          </View>
        </View>
        <Pressable
          onPress={() => removeExercise(exercise.id)}
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
          hitSlop={8}
        >
          <Trash2 color={colors.textSecondary} size={16} />
        </Pressable>
      </View>

      {/* 標題列 */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 4, marginBottom: 8 }}>
        <Text style={[styles.colHeader, { width: 32 }]}>#</Text>
        <Text style={[styles.colHeader, { flex: 1 }]}>重量 kg</Text>
        <Text style={[styles.colHeader, { flex: 1 }]}>次數</Text>
        <Text style={[styles.colHeader, { width: 40 }]}>完成</Text>
      </View>

      <View style={{ gap: 8 }}>
        {exercise.sets.map((set) => (
          <View
            key={set.id}
            style={{ flexDirection: 'row', alignItems: 'center', opacity: set.completed ? 0.6 : 1 }}
          >
            <Text style={{ width: 32, textAlign: 'center', color: colors.textSecondary, fontSize: 12, fontFamily: 'JetBrains Mono' }}>
              {set.setNumber}
            </Text>
            <NumberInput
              value={set.weight}
              step={2.5}
              onDecrease={() => updateSet(exercise.id, set.id, { weight: Math.max(0, set.weight - 2.5) })}
              onIncrease={() => updateSet(exercise.id, set.id, { weight: set.weight + 2.5 })}
              onChange={(v) => updateSet(exercise.id, set.id, { weight: v })}
            />
            <NumberInput
              value={set.reps}
              step={1}
              onDecrease={() => updateSet(exercise.id, set.id, { reps: Math.max(0, set.reps - 1) })}
              onIncrease={() => updateSet(exercise.id, set.id, { reps: set.reps + 1 })}
              onChange={(v) => updateSet(exercise.id, set.id, { reps: v })}
            />
            <Pressable
              onPress={() => {
                toggleSetCompleted(exercise.id, set.id);
                if (!set.completed) onSetCompleted?.();
              }}
              style={{
                width: 40,
                height: 40,
                marginLeft: 'auto',
                borderRadius: colors.radiusButton,
                borderWidth: 2,
                borderColor: set.completed ? colors.accent : colors.borderColor,
                backgroundColor: set.completed ? colors.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check color={set.completed ? colors.bgPrimary : colors.textSecondary} size={18} strokeWidth={3} />
            </Pressable>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() => addSet(exercise.id)}
        style={{
          marginTop: 12,
          paddingVertical: 8,
          borderRadius: colors.radiusButton,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.borderColor,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: colors.textSecondary, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          + 新增組
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = {
  colHeader: {
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  } as const,
};

interface NumberInputProps {
  value: number;
  step?: number;
  onChange: (v: number) => void;
  onIncrease: () => void;
  onDecrease: () => void;
}

function NumberInput({ value, onChange, onIncrease, onDecrease }: NumberInputProps) {
  const { colors } = useThemeStore();
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgSecondary,
        borderRadius: colors.radiusButton,
        marginHorizontal: 4,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={onDecrease}
        style={{ width: 32, height: 40, alignItems: 'center', justifyContent: 'center' }}
      >
        <Minus color={colors.textSecondary} size={14} />
      </Pressable>
      <TextInput
        value={value === 0 ? '' : String(value)}
        onChangeText={(t) => {
          const v = parseFloat(t);
          onChange(isNaN(v) ? 0 : v);
        }}
        keyboardType="decimal-pad"
        style={{
          flex: 1,
          height: 40,
          color: colors.textPrimary,
          fontSize: 14,
          fontFamily: 'JetBrains Mono',
          textAlign: 'center',
          padding: 0,
        }}
      />
      <Pressable
        onPress={onIncrease}
        style={{ width: 32, height: 40, alignItems: 'center', justifyContent: 'center' }}
      >
        <Plus color={colors.textSecondary} size={14} />
      </Pressable>
    </View>
  );
}
