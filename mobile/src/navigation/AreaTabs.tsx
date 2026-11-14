import { Tabs } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NotificationBell } from "@/features/notifications/NotificationsScreen";
import { useTheme } from "@/theme/ThemeProvider";

export type TabDef = {
  /** Route file name inside the area folder (index, attendance, more…). */
  name: string;
  title: string;
  icon: LucideIcon;
  /** Header title when it differs from the tab label. */
  headerTitle?: string;
};

/**
 * The bottom tabs of a role area. Each area's _layout.tsx lists its tabs; any
 * other route file in the folder (details) is hidden from the bar and pushed
 * on top of the tabs.
 */
export const AreaTabs = ({ tabs, hidden = [] }: { tabs: TabDef[]; hidden?: string[] }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: 58 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" },
        sceneStyle: { backgroundColor: colors.background },
        headerRight: () => <NotificationBell />,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.headerTitle ?? tab.title,
            tabBarLabel: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarIcon: ({ color, size }) => <tab.icon color={color} size={size ?? 24} />,
          }}
        />
      ))}
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
};
