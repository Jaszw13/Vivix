import { ScrollView, View, Text, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/themeStore';
import type { ReactNode } from 'react';

interface ScreenProps extends ScrollViewProps {
  children: ReactNode;
  title?: string;
  noPadding?: boolean;
  showTabBar?: boolean;
}

// 含 SafeArea + 滾動容器的主畫面殼
export function Screen({ children, title, noPadding, showTabBar = true, ...rest }: ScreenProps) {
  const { colors } = useThemeStore();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      {title ? (
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderColor,
          }}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 22,
              fontWeight: '700',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Text>
        </View>
      ) : (
        <View style={{ height: insets.top }} />
      )}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: noPadding ? 0 : 16,
          paddingTop: noPadding ? 0 : 16,
          paddingBottom: (showTabBar ? 100 : 24) + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        {...rest}
      >
        {children}
      </ScrollView>
    </View>
  );
}

// 不滾動的畫面（例如訓練中）
interface FlexScreenProps {
  children: ReactNode;
  rightAction?: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}

export function FlexScreen({ children, rightAction }: FlexScreenProps) {
  const { colors } = useThemeStore();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary, paddingTop: insets.top }}>
      {rightAction ? <View>{rightAction}</View> : null}
      {children}
    </View>
  );
}
