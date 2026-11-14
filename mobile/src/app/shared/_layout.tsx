import { Stack } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";

/** Detail screens several roles open (notice, report card, receipt, notifications, about). */
export default function SharedLayout() {
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
    />
  );
}
