import { useState } from 'react';
import { View, Text, TextInput, Alert, Pressable } from 'react-native';
import { Palette, User, Trash2, Info, ChevronRight, Zap } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Card, SectionHeader, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useThemeStore } from '@/store/themeStore';
import { useProfileStore } from '@/store/profileStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { darkTheme, lightTheme, type ThemeName } from '@/theme/colors';

export default function SettingsPage() {
  const { colors, theme, setTheme } = useThemeStore();
  const { profile, updateProfile, resetAllData } = useProfileStore();
  const { sessions, personalRecords } = useWorkoutStore();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [editingWeight, setEditingWeight] = useState(false);
  const [weightInput, setWeightInput] = useState(
    profile.bodyWeight ? String(profile.bodyWeight) : ''
  );

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed.length === 0) {
      Alert.alert('請輸入有效名稱');
      return;
    }
    updateProfile({ name: trimmed });
    setEditingName(false);
  };

  const handleSaveWeight = () => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0 || w > 500) {
      Alert.alert('請輸入有效體重（1-500 kg）');
      return;
    }
    updateProfile({ bodyWeight: w });
    setEditingWeight(false);
  };

  const handleResetData = () => {
    Alert.alert(
      '重置所有資料？',
      '將清除所有訓練記錄、個人紀錄與設定檔。此操作無法復原。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確認重置',
          style: 'destructive',
          onPress: () => {
            resetAllData();
            Alert.alert('已重置', '所有資料已清除');
          },
        },
      ]
    );
  };

  const themeOptions: { name: ThemeName; label: string; subtitle: string; preview: typeof darkTheme }[] = [
    {
      name: 'dark',
      label: '工業電力',
      subtitle: '霓虹黃 × 炭黑 · 銳利工業風',
      preview: darkTheme,
    },
    {
      name: 'light',
      label: '高雅米白',
      subtitle: '暖金 × 米白 · 精品低調感',
      preview: lightTheme,
    },
  ];

  return (
    <Screen title="設定">
      {/* 主題切換 */}
      <View style={{ marginBottom: 24 }}>
        <SectionHeader
          title="介面主題"
          subtitle="點選切換設計風格"
        />
        <View style={{ gap: 12 }}>
          {themeOptions.map((opt) => {
            const isActive = theme === opt.name;
            const p = opt.preview;
            return (
              <PressableCard
                key={opt.name}
                isActive={isActive}
                onPress={() => setTheme(opt.name)}
                accent={p.accent}
                bgPrimary={p.bgPrimary}
                bgCard={p.bgCard}
                bgSecondary={p.bgSecondary}
                borderColor={p.borderColor}
                textPrimary={p.textPrimary}
                textSecondary={p.textSecondary}
                label={opt.label}
                subtitle={opt.subtitle}
                radiusCard={p.radiusCard}
              />
            );
          })}
        </View>
      </View>

      {/* 個人資料 */}
      <View style={{ marginBottom: 24 }}>
        <SectionHeader title="個人資料" />
        <Card style={{ padding: 0 }}>
          {/* 名稱 */}
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: colors.radiusButton,
                backgroundColor: colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User color={colors.accent} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                名稱
              </Text>
              {editingName ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoFocus
                    style={{
                      flex: 1,
                      color: colors.textPrimary,
                      fontSize: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.accent,
                      paddingVertical: 2,
                    }}
                  />
                  <Button size="sm" onPress={handleSaveName} title="儲存" />
                </View>
              ) : (
                <Pressable onPress={() => { setEditingName(true); setNameInput(profile.name); }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
                      {profile.name}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>編輯</Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: colors.borderColor + '55', marginHorizontal: 16 }} />

          {/* 體重 */}
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: colors.radiusButton,
                backgroundColor: colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap color={colors.accent} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                體重
              </Text>
              {editingWeight ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <TextInput
                    value={weightInput}
                    onChangeText={setWeightInput}
                    autoFocus
                    keyboardType="decimal-pad"
                    style={{
                      flex: 1,
                      color: colors.textPrimary,
                      fontSize: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.accent,
                      paddingVertical: 2,
                    }}
                  />
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>kg</Text>
                  <Button size="sm" onPress={handleSaveWeight} title="儲存" />
                </View>
              ) : (
                <Pressable onPress={() => { setEditingWeight(true); setWeightInput(profile.bodyWeight ? String(profile.bodyWeight) : ''); }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: 'JetBrains Mono' }}>
                      {profile.bodyWeight ?? '—'} <Text style={{ color: colors.textSecondary, fontSize: 11 }}>kg</Text>
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>編輯</Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: colors.borderColor + '55', marginHorizontal: 16 }} />

          {/* 加入日期 */}
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: colors.radiusButton,
                backgroundColor: colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Info color={colors.accent} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                加入日期
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600', fontFamily: 'JetBrains Mono', marginTop: 4 }}>
                {new Date(profile.createdAt).toLocaleDateString('zh-TW')}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* 訓練數據總覽 */}
      <View style={{ marginBottom: 24 }}>
        <SectionHeader title="資料總覽" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Card style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
              {sessions.length}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 }}>
              訓練次數
            </Text>
          </Card>
          <Card style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
              {personalRecords.length}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 }}>
              PR 數量
            </Text>
          </Card>
          <Card style={{ flex: 1, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700', fontFamily: 'JetBrains Mono' }}>
              {Math.round(sessions.reduce((s, sess) => s + sess.totalVolume, 0) / 1000)}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 }}>
              總噸數
            </Text>
          </Card>
        </View>
      </View>

      {/* 關於 */}
      <View style={{ marginBottom: 24 }}>
        <SectionHeader title="關於" />
        <Card style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Palette color={colors.accent} size={20} />
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '700' }}>
                IRONPULSE
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                力量訓練追蹤 · v1.0.0
              </Text>
            </View>
            <View style={{ marginLeft: 'auto' }}>
              <Badge variant="accent">MOBILE</Badge>
            </View>
          </View>
          <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderColor + '55' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
              專為力量訓練設計的記錄工具，支援雙主題切換、1RM 估算、PR 追蹤與圖表分析。
            </Text>
          </View>
        </Card>
      </View>

      {/* 危險區 */}
      <View style={{ marginBottom: 24 }}>
        <SectionHeader title="資料管理" />
        <Button variant="danger" fullWidth onPress={handleResetData}>
          <Trash2 color={colors.auxiliary} size={16} />
          <Text style={{ color: colors.auxiliary, fontSize: 14, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            重置所有資料
          </Text>
        </Button>
      </View>
    </Screen>
  );
}

// ============ 主題預覽卡片 ============
interface PreviewProps {
  isActive: boolean;
  onPress: () => void;
  accent: string;
  bgPrimary: string;
  bgCard: string;
  bgSecondary: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  label: string;
  subtitle: string;
  radiusCard: number;
}

function PressableCard(p: PreviewProps) {
  return (
    <Pressable onPress={p.onPress} style={{}}>
      <View
        style={{
          flexDirection: 'row',
          borderRadius: Math.max(p.radiusCard, 8),
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: p.isActive ? p.accent : 'transparent',
        }}
      >
        {/* 左側預覽 */}
        <View style={{ width: 84, backgroundColor: p.bgPrimary, padding: 10, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: p.accent }} />
            <View style={{ width: 16, height: 3, backgroundColor: p.textSecondary }} />
          </View>
          <View style={{ gap: 4 }}>
            <View style={{ height: 18, backgroundColor: p.bgCard, borderRadius: 2 }} />
            <View style={{ height: 8, width: 30, backgroundColor: p.accent, borderRadius: 2 }} />
            <View style={{ height: 14, width: '80%', backgroundColor: p.bgSecondary, borderRadius: 2 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            <View style={{ flex: 1, height: 18, backgroundColor: p.bgSecondary, borderRadius: 2 }} />
            <View style={{ flex: 1, height: 18, backgroundColor: p.bgSecondary, borderRadius: 2 }} />
            <View style={{ flex: 1, height: 18, backgroundColor: p.bgSecondary, borderRadius: 2 }} />
          </View>
        </View>

        {/* 右側資訊 */}
        <View
          style={{
            flex: 1,
            backgroundColor: p.bgCard,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ color: p.textPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {p.label}
              </Text>
              {p.isActive ? (
                <View style={{ backgroundColor: p.accent, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: p.bgPrimary, fontSize: 9, fontWeight: '700', letterSpacing: 1.2 }}>
                    ACTIVE
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={{ color: p.textSecondary, fontSize: 11 }}>
              {p.subtitle}
            </Text>
          </View>
          <ChevronRight color={p.textSecondary} size={16} />
        </View>
      </View>
    </Pressable>
  );
}
