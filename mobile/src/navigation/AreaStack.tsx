import { Stack } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * A role area: its bottom tabs ("(tabs)") plus the area's own detail screens
 * pushed on top, so they get a back button (Android back, iOS swipe).
 */
export const AreaStack = () => {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: colors.background },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
};
