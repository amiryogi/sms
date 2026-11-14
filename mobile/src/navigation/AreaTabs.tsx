import { View } from "react-native";
import { Tabs } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@/components/ui";
import { NotificationBell } from "@/features/notifications/NotificationsScreen";
import { HomeStatusBand } from "./HomeStatusBand";
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
 * The bottom tabs of a role area. The first tab (home) draws its own hero
 * header with the bell under a brand-coloured status strip; the others get a
 * plain title with the bell.
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
          borderTopColor: colors.line,
          height: 68 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: { fontFamily: "Mukta_600SemiBold", fontSize: 12, marginTop: 2 },
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: "Mukta_700Bold", fontSize: 21 },
        headerTitleAlign: "left",
        sceneStyle: { backgroundColor: colors.canvas },
        headerRight: () => <NotificationBell />,
      }}
    >
      {tabs.map((tab, i) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.headerTitle ?? tab.title,
            tabBarLabel: tab.title,
            tabBarAccessibilityLabel: tab.title,
            // Home draws its own hero; its header is just the status-bar strip in the brand colour.
            ...(i === 0 ? { header: () => <HomeStatusBand /> } : {}),
            tabBarIcon: ({ color, focused }) => (
              // Material-style indicator: a soft pill behind the active icon.
              <View className={cn("h-8 w-14 items-center justify-center rounded-full", focused && "bg-brand-soft")}>
                <tab.icon color={color} size={22} strokeWidth={focused ? 2.4 : 2} />
              </View>
            ),
          }}
        />
      ))}
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
};
