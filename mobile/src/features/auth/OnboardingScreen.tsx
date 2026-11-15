import { useRef, useState } from "react";
import { FlatList, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { GraduationCap, ShieldCheck, Users, type LucideIcon } from "lucide-react-native";
import { AppText, Button, cn } from "@/components/ui";
import { BrandLogo } from "@/features/brand/BrandLogo";
import { PREF_KEYS, writeJson } from "@/lib/storage";
import { useTheme } from "@/theme/ThemeProvider";

type Slide = { key: string; icon: LucideIcon; title: string; body: string };

/** Three short slides on first launch, then the sign-in screen. Shown once per install. */
export const OnboardingScreen = () => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<Slide>>(null);

  const slides: Slide[] = [
    { key: "1", icon: GraduationCap, title: t("onboarding.slide1Title"), body: t("onboarding.slide1Body") },
    { key: "2", icon: Users, title: t("onboarding.slide2Title"), body: t("onboarding.slide2Body") },
    { key: "3", icon: ShieldCheck, title: t("onboarding.slide3Title"), body: t("onboarding.slide3Body") },
  ];

  const finish = async () => {
    await writeJson(PREF_KEYS.onboardingDone, true);
    router.replace("/login");
  };

  const next = () => {
    if (index < slides.length - 1) {
      list.current?.scrollToIndex({ index: index + 1, animated: true });
      setIndex(index + 1);
    } else finish();
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)));
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="items-end px-4 pt-2">
        <Button title={t("onboarding.skip")} variant="ghost" size="sm" onPress={finish} />
      </View>
      <FlatList
        ref={list}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width }} className="flex-1 items-center justify-center gap-5 px-10">
            {item.key === "1" ? (
              // The first slide follows the launch animation: the same logo, standing still.
              <BrandLogo width={Math.min(width * 0.6, 240)} />
            ) : (
              <View className="h-36 w-36 items-center justify-center rounded-[40px] bg-brand-soft">
                <item.icon size={64} color={colors.brand} strokeWidth={1.8} />
              </View>
            )}
            <AppText variant="display" className="text-center text-3xl" accessibilityRole="header">
              {item.title}
            </AppText>
            <AppText variant="body" className="text-center text-lg text-ink-muted">
              {item.body}
            </AppText>
          </View>
        )}
      />
      <View className="gap-6 px-6 pb-6">
        <View className="flex-row justify-center gap-2" accessibilityLabel={`Page ${index + 1} of ${slides.length}`}>
          {slides.map((s, i) => (
            <View key={s.key} className={cn("h-2 rounded-full", i === index ? "w-6 bg-brand-600" : "w-2 bg-line-strong")} />
          ))}
        </View>
        <Button title={index === slides.length - 1 ? t("onboarding.start") : t("onboarding.next")} onPress={next} fullWidth />
      </View>
    </SafeAreaView>
  );
};
