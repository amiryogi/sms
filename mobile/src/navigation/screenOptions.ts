import type { ComponentProps } from "react";
import type { Stack } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";

/** Header and content style shared by every stack (root, area, shared). */
type StackOptions = Exclude<ComponentProps<typeof Stack>["screenOptions"], ((...args: never[]) => unknown) | undefined>;

export const useStackScreenOptions = (): StackOptions => {
  const { colors } = useTheme();
  return {
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.canvas },
    headerTintColor: colors.ink,
    headerTitleStyle: { fontFamily: "Mukta_700Bold", fontSize: 19 },
    contentStyle: { backgroundColor: colors.canvas },
    headerBackButtonDisplayMode: "minimal",
  };
};
