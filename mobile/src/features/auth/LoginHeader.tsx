import { useEffect, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui";
import { BrandLogo } from "@/features/brand/BrandLogo";
import { useIntroDone } from "@/features/brand/introState";
import { useReduceMotion } from "@/lib/motion";
import { useTheme } from "@/theme/ThemeProvider";
import { TOKENS } from "@/theme/tokens";

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

/**
 * The top of the sign-in screen: a gradient in the school's colour (the
 * Vidyalaya blue when the school has not set one) that slides down, then the
 * logo, the school's name word by word, a marigold rule (the sun of the
 * Vidyalaya logo) and the slogan, all centred.
 *
 * Waits for the launch animation to finish before moving, and shows the
 * final state at once with Reduce Motion on.
 */
export const LoginHeader = ({
  name,
  slogan,
  logoUrl,
  ready = true,
}: {
  name: string;
  slogan: string | null;
  logoUrl: string | null;
  /** False while the school's details are still loading: the entrance waits. */
  ready?: boolean;
}) => {
  const { brand, onBrand, onBrandIsLight } = useTheme();
  const insets = useSafeAreaInsets();
  const introDone = useIntroDone();
  const reduceMotion = useReduceMotion();
  const words = name.split(/\s+/).filter(Boolean);

  const [v] = useState(() => ({
    band: new Animated.Value(0),
    logo: new Animated.Value(0),
    halo: new Animated.Value(0),
    rule: new Animated.Value(0),
    slogan: new Animated.Value(0),
    words: Array.from({ length: 12 }, () => new Animated.Value(0)),
  }));

  useEffect(() => {
    if (!ready || !introDone || reduceMotion === null) return;
    const all = [v.band, v.logo, v.halo, v.rule, v.slogan, ...v.words];
    if (reduceMotion) {
      all.forEach((x) => x.setValue(1));
      return;
    }
    const t = (value: Animated.Value, delay: number, duration: number, easing = ease) =>
      Animated.timing(value, { toValue: 1, delay, duration, easing, useNativeDriver: true });
    const wordsAt = 520;
    const afterWords = wordsAt + Math.min(words.length, 12) * 80 + 160;
    const run = Animated.parallel([
      t(v.band, 0, 560, Easing.out(Easing.cubic)),
      Animated.spring(v.logo, { toValue: 1, delay: 300, friction: 5, tension: 70, useNativeDriver: true }),
      t(v.halo, 520, 900, Easing.out(Easing.quad)),
      ...v.words.map((w, i) => t(w, wordsAt + i * 80, 420)),
      t(v.rule, afterWords, 380),
      t(v.slogan, afterWords + 120, 460),
    ]);
    run.start();
    return () => run.stop();
  }, [ready, introDone, reduceMotion, v, words.length]);

  const lerp = (x: Animated.Value, from: number, to: number) => x.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  const appear = (x: Animated.Value, dy = 14) => ({ opacity: x, transform: [{ translateY: lerp(x, dy, 0) }] });
  const veil = onBrandIsLight ? "255,255,255" : "0,0,0";

  return (
    <Animated.View style={{ transform: [{ translateY: lerp(v.band, -420, 0) }] }}>
      <LinearGradient
        colors={[brand[900], brand[700], brand[500]]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 28, paddingBottom: 72, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: "hidden" }}
      >
        {/* Two soft discs for depth; decorative only. */}
        <View pointerEvents="none" style={{ position: "absolute", width: 260, height: 260, borderRadius: 130, top: -90, right: -80, backgroundColor: `rgba(${veil},0.08)` }} />
        <View pointerEvents="none" style={{ position: "absolute", width: 180, height: 180, borderRadius: 90, bottom: -70, left: -60, backgroundColor: `rgba(${veil},0.06)` }} />

        <View className="items-center px-6">
          <View className="h-28 w-28 items-center justify-center">
            {/* One ring that opens out behind the logo as it lands. */}
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                width: 104,
                height: 104,
                borderRadius: 52,
                borderWidth: 2,
                borderColor: onBrand,
                opacity: v.halo.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] }),
                transform: [{ scale: lerp(v.halo, 0.9, 1.45) }],
              }}
            />
            <Animated.View
              style={{
                opacity: v.logo.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: "clamp" }),
                transform: [{ scale: lerp(v.logo, 0.4, 1) }, { rotate: v.logo.interpolate({ inputRange: [0, 1], outputRange: ["-14deg", "0deg"] }) }],
              }}
              className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-white"
            >
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={{ width: 72, height: 72 }} contentFit="contain" accessibilityLabel={name} />
              ) : (
                <BrandLogo variant="mark" width={72} />
              )}
            </Animated.View>
          </View>

          <View accessible accessibilityRole="header" accessibilityLabel={name} className="mt-5 flex-row flex-wrap justify-center gap-x-2.5">
            {words.map((word, i) => (
              <Animated.View key={`${i}-${word}`} style={appear(v.words[Math.min(i, 11)]!, 18)}>
                <Text
                  style={{ color: onBrand, letterSpacing: -0.6, textShadowColor: "rgba(0,0,0,0.18)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 }}
                  className="text-center text-3xl font-extrabold"
                >
                  {word}
                </Text>
              </Animated.View>
            ))}
          </View>

          <Animated.View
            style={{ opacity: v.rule, transform: [{ scaleX: v.rule }], backgroundColor: TOKENS.light["warn-solid"] }}
            className="mt-3 h-1 w-10 rounded-full"
          />

          {slogan ? (
            <Animated.View style={appear(v.slogan, 10)} className="mt-3 max-w-[300px]">
              <Text style={{ color: onBrand, opacity: 0.92 }} className="text-center text-base font-medium">
                {slogan}
              </Text>
            </Animated.View>
          ) : null}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};
