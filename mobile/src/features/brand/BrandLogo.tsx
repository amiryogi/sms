import { View } from "react-native";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeProvider";
import { TOKENS } from "@/theme/tokens";
import { BRAND_IMAGES, BRAND_LAYOUT as L, markHeight } from "./assets";

/**
 * The Vidyalaya SMS logo. "lockup" is the emblem with the words under it,
 * rebuilt from its parts so that in dark mode the navy "Vidyalaya" and the
 * blue "SMS" can be drawn light (navy on the dark canvas is unreadable).
 * "mark" is the emblem alone.
 */
export const BrandLogo = ({ width, variant = "lockup" }: { width: number; variant?: "lockup" | "mark" }) => {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const dark = scheme === "dark";

  if (variant === "mark") {
    return (
      <Image
        source={BRAND_IMAGES.mark}
        style={{ width, height: markHeight(width) }}
        contentFit="contain"
        accessibilityLabel={t("brand.name")}
        accessibilityRole="image"
      />
    );
  }

  const k = width / L.logo.width; // dp per asset px
  const box = (part: { x: number; y: number; width: number; height: number }) => ({
    position: "absolute" as const,
    left: part.x * k,
    top: part.y * k,
    width: part.width * k,
    height: part.height * k,
  });
  return (
    <View style={{ width, height: L.logo.height * k }} accessible accessibilityRole="image" accessibilityLabel={t("brand.name")}>
      <Image source={BRAND_IMAGES.mark} style={box(L.mark)} contentFit="contain" />
      <Image source={BRAND_IMAGES.wordmark} style={box(L.wordmark)} contentFit="contain" tintColor={dark ? TOKENS.dark.ink : undefined} />
      <Image source={BRAND_IMAGES.rules} style={box(L.sms)} contentFit="contain" tintColor={dark ? TOKENS.dark.info : undefined} />
      <Image source={BRAND_IMAGES.sms} style={box(L.sms)} contentFit="contain" tintColor={dark ? TOKENS.dark.info : undefined} />
    </View>
  );
};
