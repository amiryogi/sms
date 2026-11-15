import { Stack } from "expo-router";
import { useStackScreenOptions } from "./screenOptions";

/**
 * A role area: its bottom tabs ("(tabs)") plus the area's own detail screens
 * pushed on top, so they get a back button (Android back, iOS swipe).
 */
export const AreaStack = () => {
  const options = useStackScreenOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
};
