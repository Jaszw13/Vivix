import { Tabs } from 'expo-router';
import { Dumbbell, ClipboardList, BarChart3, Library, Settings } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';

export default function TabsLayout() {
  const { colors, theme } = useThemeStore();
  const stroke = colors.iconStroke;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor: colors.borderColor,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '主控台',
          tabBarIcon: ({ color, focused }) => (
            <Dumbbell color={color} size={22} strokeWidth={focused ? stroke + 0.5 : stroke - 0.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: '計畫',
          tabBarIcon: ({ color, focused }) => (
            <ClipboardList color={color} size={22} strokeWidth={focused ? stroke + 0.5 : stroke - 0.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: '進度',
          tabBarIcon: ({ color, focused }) => (
            <BarChart3 color={color} size={22} strokeWidth={focused ? stroke + 0.5 : stroke - 0.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: '動作',
          tabBarIcon: ({ color, focused }) => (
            <Library color={color} size={22} strokeWidth={focused ? stroke + 0.5 : stroke - 0.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color, focused }) => (
            <Settings color={color} size={22} strokeWidth={focused ? stroke + 0.5 : stroke - 0.5} />
          ),
        }}
      />
    </Tabs>
  );
}
