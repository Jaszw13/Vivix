import { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, AppState } from 'react-native';
import { Play, Pause, RotateCcw, X, Plus, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '@/store/themeStore';

interface RestTimerProps {
  visible: boolean;
  initialSeconds?: number;
  onClose: () => void;
}

export function RestTimer({ visible, initialSeconds = 90, onClose }: RestTimerProps) {
  const { colors } = useThemeStore();
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 重設當 initialSeconds 變化或開啟時
  useEffect(() => {
    if (visible) {
      setRemaining(initialSeconds);
      setRunning(true);
    }
  }, [visible, initialSeconds]);

  useEffect(() => {
    if (!visible || !running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, running]);

  const adjust = (delta: number) => {
    setRemaining((r) => Math.max(0, r + delta));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const reset = () => {
    setRemaining(initialSeconds);
    setRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const toggleRunning = () => {
    setRunning((r) => !r);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const progress = ((initialSeconds - remaining) / initialSeconds) * 100;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  // 圓環 SVG 計算
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable
          onPress={onClose}
          style={{ position: 'absolute', top: 60, right: 16, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <X color={colors.textSecondary} size={24} />
        </Pressable>

        <Text style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 32 }}>
          組間休息
        </Text>

        {/* 圓環 */}
        <View style={{ width: 288, height: 288, alignItems: 'center', justifyContent: 'center', marginBottom: 48 }}>
          {/* 背景 SVG */}
          <View
            style={{
              position: 'absolute',
              width: 256,
              height: 256,
              borderRadius: 128,
              borderWidth: 3,
              borderColor: colors.borderColor,
            }}
          />
          {/* 進度圓環 */}
          <View
            style={{
              position: 'absolute',
              width: 256,
              height: 256,
              borderRadius: 128,
              borderWidth: 4,
              borderColor: colors.accent,
              borderTopColor: colors.bgPrimary,
              borderRightColor: colors.bgPrimary,
              borderBottomColor: remaining === 0 ? colors.accent : colors.bgPrimary,
              borderLeftColor: colors.bgPrimary,
              transform: [{ rotate: `${-90 + (progress * 3.6)}deg` }],
            }}
          />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: colors.textPrimary, fontSize: 64, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </Text>
            {remaining === 0 ? (
              <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 8 }}>
                休息結束
              </Text>
            ) : null}
          </View>
        </View>

        {/* 控制按鈕 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 32 }}>
          <Pressable
            onPress={() => adjust(-15)}
            style={{ width: 48, height: 48, borderRadius: colors.radiusButton, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center', justifyContent: 'center' }}
          >
            <Minus color={colors.textPrimary} size={20} />
          </Pressable>
          <Pressable
            onPress={toggleRunning}
            style={{
              width: 64,
              height: 64,
              borderRadius: colors.radiusButton,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              ...colors.shadowButton,
            }}
          >
            {running ? <Pause color={colors.bgPrimary} size={28} fill={colors.bgPrimary} /> : <Play color={colors.bgPrimary} size={28} fill={colors.bgPrimary} />}
          </Pressable>
          <Pressable
            onPress={() => adjust(15)}
            style={{ width: 48, height: 48, borderRadius: colors.radiusButton, borderWidth: 1, borderColor: colors.borderColor, alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus color={colors.textPrimary} size={20} />
          </Pressable>
        </View>

        <Pressable onPress={reset} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <RotateCcw color={colors.textSecondary} size={14} />
          <Text style={{ color: colors.textSecondary, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' }}>重置</Text>
        </Pressable>

        {/* 預設時間 */}
        <View style={{ position: 'absolute', bottom: 60, flexDirection: 'row', gap: 8 }}>
          {[30, 60, 90, 120, 180].map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setRemaining(s);
                setRunning(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: colors.radiusButton,
                borderWidth: 1,
                borderColor: initialSeconds === s ? colors.accent : colors.borderColor,
              }}
            >
              <Text
                style={{
                  color: initialSeconds === s ? colors.accent : colors.textSecondary,
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono',
                }}
              >
                {s}s
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}
