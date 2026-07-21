import { Pressable, Text, ActivityIndicator, View, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';
import { useThemeStore } from '@/store/themeStore';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends PressableProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  title?: string;
  children?: ReactNode;
}

const sizeMap: Record<Size, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 36, paddingHorizontal: 12, fontSize: 12 },
  md: { height: 44, paddingHorizontal: 20, fontSize: 14 },
  lg: { height: 56, paddingHorizontal: 24, fontSize: 16 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  title,
  children,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const { colors } = useThemeStore();
  const s = sizeMap[size];

  const variantStyle = {
    primary: { backgroundColor: colors.accent, borderWidth: 0 },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.accent,
    },
    ghost: { backgroundColor: 'transparent', borderWidth: 0 },
    danger: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.auxiliary,
    },
  }[variant];

  const variantTextStyle = {
    primary: { color: colors.bgPrimary },
    secondary: { color: colors.accent },
    ghost: { color: colors.textSecondary },
    danger: { color: colors.auxiliary },
  }[variant];

  // 若有 children 且不是字串，直接渲染 children；否則渲染 title 文字
  const hasNodeChildren = children !== undefined && typeof children !== 'string';

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: colors.radiusButton,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: pressed ? 0.85 : 1,
          ...(variant === 'primary' ? colors.shadowButton : {}),
        },
        variantStyle,
        fullWidth && { flex: 1 },
        style as object,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variantTextStyle.color} size="small" />
      ) : hasNodeChildren ? (
        children
      ) : (
        <Text
          style={{
            color: variantTextStyle.color,
            fontSize: s.fontSize,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {title ?? (typeof children === 'string' ? children : '')}
        </Text>
      )}
    </Pressable>
  );
}
