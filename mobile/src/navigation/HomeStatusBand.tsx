import { View } from "react-native";
import { useIsFocused } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * The header of each area's home tab: only the status-bar strip, in the
 * school's colour, so the hero below it reads as one band and anything that
 * scrolls up passes under the colour, never under the clock. While home is
 * focused it sets status-bar icons that read on that colour; the declarative
 * StatusBar stacks over the root one and is removed when home loses focus.
 */
export const HomeStatusBand = () => {
  const insets = useSafeAreaInsets();
  const { brand, onBrandIsLight } = useTheme();
  const focused = useIsFocused();
  return (
    <View style={{ height: insets.top, backgroundColor: brand[600] }}>
      {focused ? <StatusBar style={onBrandIsLight ? "light" : "dark"} /> : null}
    </View>
  );
};
