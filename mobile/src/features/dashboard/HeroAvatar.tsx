import { useEffect, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui";
import { useReduceMotion } from "@/lib/motion";
import { useTheme } from "@/theme/ThemeProvider";
import { initials } from "@/utils/format";

/**
 * The signed-in person's photo in the home header: a white ring on the brand
 * colour, springing in with one soft halo. Without a photo, their initials on
 * a deeper shade of the brand inside the white ring.
 * With Reduce Motion on it simply appears.
 */
export const HeroAvatar = ({ name, uri, size = 64 }: { name: string; uri: string | null; size?: number }) => {
  const { brand, onBrand, onBrandIsLight } = useTheme();
  const reduceMotion = useReduceMotion();
  const [[enter, halo]] = useState(() => [new Animated.Value(0), new Animated.Value(0)] as const);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      enter.setValue(1);
      halo.setValue(1);
      return;
    }
    const run = Animated.parallel([
      Animated.spring(enter, { toValue: 1, delay: 150, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(halo, { toValue: 1, delay: 450, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    run.start();
    return () => run.stop();
  }, [reduceMotion, enter, halo]);

  const ring = 3;
  const veil = onBrandIsLight ? "255,255,255" : "0,0,0";
  const showPhoto = !!uri && !failed;

  return (
    <View style={{ width: size + ring * 2, height: size + ring * 2 }} className="items-center justify-center">
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: size + ring * 2,
          height: size + ring * 2,
          borderRadius: size,
          backgroundColor: `rgba(${veil},0.35)`,
          opacity: halo.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 0.9, 0] }),
          transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
        }}
      />
      <Animated.View
        style={{
          width: size + ring * 2,
          height: size + ring * 2,
          borderRadius: size,
          padding: ring,
          backgroundColor: onBrand,
          opacity: enter.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        {showPhoto ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            contentFit="cover"
            transition={250}
            onError={() => setFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand[700] }} className="items-center justify-center">
            <Text style={{ color: onBrand }} className="text-xl font-extrabold">
              {initials(name)}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};
