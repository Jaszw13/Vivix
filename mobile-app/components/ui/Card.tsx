import { View, Text, type ViewStyle } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  inset?: boolean;
}

export function Card({ children, style, inset }: CardProps) {
  const { colors } = useThemeStore();
  return (
    <View
      style={[
        {
          backgroundColor: inset ? colors.bgSecondary : colors.bgCard,
          borderRadius: colors.radiusCard,
          borderWidth: 1,
          borderColor: colors.borderColor + '55',
          ...colors.shadowCard,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const { colors } = useThemeStore();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 24,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export function StatTile({ label, value, unit, highlight }: StatTileProps) {
  const { colors } = useThemeStore();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
      <Text
        style={{
          color: highlight ? colors.auxiliary : colors.textPrimary,
          fontSize: 24,
          fontWeight: '700',
          fontFamily: 'JetBrains Mono',
        }}
      >
        {value}
        {unit ? (
          <Text style={{ color: colors.textSecondary, fontSize: 11 }}> {unit}</Text>
        ) : null}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginTop: 6,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'accent' | 'auxiliary';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const { colors } = useThemeStore();
  const styles = {
    default: {
      backgroundColor: colors.bgSecondary,
      color: colors.textSecondary,
      borderColor: colors.borderColor,
    },
    accent: {
      backgroundColor: colors.accentSoft,
      color: colors.accent,
      borderColor: colors.accent + '4D',
    },
    auxiliary: {
      backgroundColor: colors.auxiliary + '26',
      color: colors.auxiliary,
      borderColor: colors.auxiliary + '4D',
    },
  }[variant];

  return (
    <View
      style={{
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color: styles.color,
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Text>
    </View>
  );
}
