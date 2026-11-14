import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { useTranslation } from "react-i18next";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { Text } from "@/components/ui";
import { useTheme } from "@/theme/ThemeProvider";
import { TOKENS } from "@/theme/tokens";
import { BRAND_IMAGES, BRAND_LAYOUT as L, markHeight, SPLASH_IMAGE_WIDTH } from "./assets";

/** Light: the welcome screen's white. Dark: the app's canvas. app.config.ts's splash uses the same two. */
export const INTRO_BACKGROUND = { light: "#FFFFFF", dark: TOKENS.dark.canvas } as const;

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const STEPS = {
  // delay and duration in ms; the whole sequence is about 1.6 s.
  move: { delay: 100, duration: 620, easing: ease }, // the emblem rises from the splash spot
  waves: { delay: 120, duration: 900, easing: Easing.out(Easing.cubic) },
  arc: { delay: 300, duration: 680, easing: Easing.out(Easing.back(1.4)) }, // the sun comes up behind the book
  capDrop: { delay: 640, duration: 760, easing: Easing.bounce }, // the cap lands on the student's head
  capSpin: { delay: 640, duration: 560, easing: Easing.out(Easing.cubic) },
  words: { delay: 820, duration: 460, easing: ease },
  sms: { delay: 980, duration: 480, easing: ease },
  tagline: { delay: 1120, duration: 460, easing: ease },
} as const;
type Step = keyof typeof STEPS;
const STEP_NAMES = Object.keys(STEPS) as Step[];

/**
 * The launch animation, drawn over the app while the session is restored.
 *
 * The native splash shows the book and student (assets/splash-icon.png) at
 * SPLASH_IMAGE_WIDTH in the middle of the screen; the first frame here is the
 * same picture in the same place, so hiding the splash is seamless. Then the
 * emblem rises, the sun comes up behind the book, the mortarboard drops onto
 * the student's head, and the name and tagline arrive over the welcome
 * screen's waves.
 *
 * It fades out once it has played and `ready` is true (the session is known),
 * so it never delays the app by more than its own length. A tap skips it, and
 * with Reduce Motion on it shows the finished logo without movement.
 */
export const BrandIntro = ({ ready }: { ready: boolean }) => {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const dark = scheme === "dark";
  const { width: W, height: H } = useWindowDimensions();

  // Created once; Animated values are mutable objects, read in render only to bind styles.
  const [values] = useState(() => Object.fromEntries(STEP_NAMES.map((s) => [s, new Animated.Value(0)])) as Record<Step, Animated.Value>);
  const [exit] = useState(() => new Animated.Value(0));
  const sequence = useRef<Animated.CompositeAnimation | null>(null);
  const started = useRef(false);
  const [played, setPlayed] = useState(false);
  const [gone, setGone] = useState(false);

  const finish = () => {
    sequence.current?.stop();
    STEP_NAMES.forEach((s) => values[s].setValue(1));
    setPlayed(true);
  };

  // First layout: the picture now matches the native splash, so swap them and play.
  const onLayout = () => {
    if (started.current) return;
    started.current = true;
    SplashScreen.hide();
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (reduce) return finish();
        sequence.current = Animated.parallel(
          STEP_NAMES.map((s) => Animated.timing(values[s], { toValue: 1, useNativeDriver: true, ...STEPS[s] })),
        );
        sequence.current.start(({ finished }) => finished && setPlayed(true));
      });
  };

  useEffect(() => {
    if (!played || !ready) return;
    const out = Animated.timing(exit, { toValue: 1, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: true });
    out.start(() => setGone(true));
    return () => out.stop();
  }, [played, ready, exit]);

  if (gone) return null;

  // Layout, in dp. The lockup (emblem + words, logo.png) and the tagline are centred a
  // little above the middle, as on the welcome screen.
  const lockupW = Math.min(W * 0.7, 300);
  // Narrow enough that the tagline breaks after "Management", as on the welcome design.
  const taglineW = Math.min(W - 64, 240);
  const k = lockupW / L.logo.width;
  const taglineTop = L.logo.height * k + 26;
  const groupH = taglineTop + 56;
  const top = H * 0.45 - groupH / 2;
  const left = (W - lockupW) / 2;
  const markW = L.mark.width * k;
  const markH = markHeight(markW);
  // Start: the splash picture, SPLASH_IMAGE_WIDTH wide, centred on the screen.
  const startScale = SPLASH_IMAGE_WIDTH / markW;
  const startDy = H / 2 - (top + L.mark.y * k + markH / 2);
  const wavesH = (W * L.waves.height) / L.waves.width;
  const v = values;
  const lerp = (value: Animated.Value, from: number, to: number) => value.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  const fadeIn = (value: Animated.Value, until = 0.6) => value.interpolate({ inputRange: [0, until], outputRange: [0, 1], extrapolate: "clamp" });
  const part = (p: { x: number; y: number; width: number; height: number }) => ({
    position: "absolute" as const,
    left: left + p.x * k,
    top: top + p.y * k,
    width: p.width * k,
    height: p.height * k,
  });

  return (
    <Animated.View
      onLayout={onLayout}
      pointerEvents={played ? "none" : "auto"}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, { backgroundColor: INTRO_BACKGROUND[scheme], opacity: lerp(exit, 1, 0), zIndex: 100, elevation: 100 }]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityLabel={t("brand.skipIntro")}>
        <Animated.View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: wavesH, opacity: fadeIn(v.waves, 0.4), transform: [{ translateY: lerp(v.waves, wavesH * 0.6, 0) }] }}>
          <Image source={BRAND_IMAGES.waves} style={{ width: W, height: wavesH }} contentFit="fill" />
        </Animated.View>

        <Animated.View style={{ flex: 1, transform: [{ scale: lerp(exit, 1, 1.04) }] }}>
          {/* The emblem: one group that rises from the splash spot, with the layers moving inside it. */}
          <Animated.View
            style={[
              part(L.mark),
              { transform: [{ translateY: lerp(v.move, startDy, 0) }, { scale: lerp(v.move, startScale, 1) }] },
            ]}
          >
            {dark ? (
              // A soft blue glow, so the book's navy edges stand off the dark canvas.
              <Animated.View style={{ position: "absolute", left: -markW * 0.2, top: -markH * 0.25, width: markW * 1.4, height: markH * 1.5, opacity: fadeIn(v.arc) }}>
                <Svg width="100%" height="100%">
                  <Defs>
                    <RadialGradient id="glow" cx="50%" cy="55%" r="50%">
                      <Stop offset="0" stopColor="#3B82F6" stopOpacity="0.38" />
                      <Stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#glow)" />
                </Svg>
              </Animated.View>
            ) : null}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { opacity: fadeIn(v.arc, 0.35), transform: [{ translateY: lerp(v.arc, markH * 0.32, 0) }, { scale: lerp(v.arc, 0.82, 1) }] },
              ]}
            >
              <Image source={BRAND_IMAGES.arc} style={{ width: markW, height: markH }} contentFit="contain" />
            </Animated.View>
            <Image source={BRAND_IMAGES.body} style={{ position: "absolute", width: markW, height: markH }} contentFit="contain" />
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  opacity: fadeIn(v.capSpin, 0.2),
                  transform: [{ translateY: lerp(v.capDrop, -markH * 0.95, 0) }, { rotate: v.capSpin.interpolate({ inputRange: [0, 1], outputRange: ["-200deg", "0deg"] }) }],
                },
              ]}
            >
              <Image source={BRAND_IMAGES.cap} style={{ width: markW, height: markH }} contentFit="contain" />
            </Animated.View>
          </Animated.View>

          <Animated.View style={[part(L.wordmark), { opacity: fadeIn(v.words), transform: [{ translateY: lerp(v.words, 16, 0) }] }]}>
            <Image source={BRAND_IMAGES.wordmark} style={StyleSheet.absoluteFill} contentFit="contain" tintColor={dark ? TOKENS.dark.ink : undefined} />
          </Animated.View>
          <Animated.View style={[part(L.sms), { transform: [{ scaleX: v.sms }] }]}>
            <Image source={BRAND_IMAGES.rules} style={StyleSheet.absoluteFill} contentFit="contain" tintColor={dark ? TOKENS.dark.info : undefined} />
          </Animated.View>
          <Animated.View style={[part(L.sms), { opacity: fadeIn(v.sms), transform: [{ translateY: lerp(v.sms, 10, 0) }] }]}>
            <Image source={BRAND_IMAGES.sms} style={StyleSheet.absoluteFill} contentFit="contain" tintColor={dark ? TOKENS.dark.info : undefined} />
          </Animated.View>

          <Animated.View
            style={{ position: "absolute", left: (W - taglineW) / 2, width: taglineW, top: top + taglineTop, opacity: fadeIn(v.tagline), transform: [{ translateY: lerp(v.tagline, 10, 0) }] }}
          >
            <Text style={{ color: dark ? TOKENS.dark["ink-muted"] : TOKENS.light["ink-muted"] }} className="text-center text-lg font-medium">
              {t("brand.tagline")}
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

