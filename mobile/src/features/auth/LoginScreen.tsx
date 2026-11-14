import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react";
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, Info, KeyRound, LockKeyhole, LogIn, School, UserRound } from "lucide-react-native";
import { z } from "zod";
import type { ApiFailure } from "@/api/errors";
import { schoolService } from "@/api/services/school";
import { AppText, Button, OfflineBanner, TextField, type TextInput } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLogo } from "@/features/brand/BrandLogo";
import { useIntroDone } from "@/features/brand/introState";
import { useReduceMotion } from "@/lib/motion";
import { PREF_KEYS, readJson, writeJson } from "@/lib/storage";
import { useTheme } from "@/theme/ThemeProvider";
import { resolveAssetUrl } from "@/utils/assets";
import { LoginHeader } from "./LoginHeader";

type Form = { identifier: string; password: string; schoolCode: string };

export const LoginScreen = () => {
  const { t } = useTranslation();
  const { login, notice, clearNotice } = useAuth();
  const { colors, setBrandColor } = useTheme();
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [codeChecked, setCodeChecked] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const insets = useSafeAreaInsets();

  const schema = z.object({
    identifier: z.string().trim().min(1, t("auth.identifierRequired")),
    password: z.string().min(1, t("auth.passwordRequired")),
    schoolCode: z.string().trim().max(50),
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { identifier: "", password: "", schoolCode: "" } });

  // The school code from the last sign-in on this phone brings back its branding.
  useEffect(() => {
    readJson<string | null>(PREF_KEYS.schoolCode, null).then((code) => {
      if (code) {
        setSavedCode(code);
        setValue("schoolCode", code);
      }
      setCodeChecked(true);
    });
  }, [setValue]);

  const branding = useQuery({
    queryKey: ["public-school", savedCode],
    queryFn: ({ signal }) => schoolService.publicByCode(savedCode!, signal),
    enabled: !!savedCode,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });
  const school = branding.data;

  useEffect(() => {
    if (school?.brandColor) setBrandColor(school.brandColor);
  }, [school?.brandColor, setBrandColor]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    clearNotice();
    try {
      const user = await login({ identifier: values.identifier, password: values.password, schoolCode: values.schoolCode || undefined });
      await writeJson(PREF_KEYS.schoolCode, user.school.code);
    } catch (e) {
      setError((e as ApiFailure).message);
    }
  });

  // A school code from an earlier sign-in brings the school's own name, logo and colour back;
  // otherwise the header is the product's own.
  const known = savedCode && school ? school : null;
  // The entrance waits until it knows which name to show, so it plays once.
  const headerReady = codeChecked && !(savedCode && branding.isLoading);

  return (
    <View className="flex-1 bg-canvas">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="flex-grow" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
          <LoginHeader
            ready={headerReady}
            name={known ? known.name : t("brand.name")}
            slogan={known ? (known.tagline ?? null) : t("brand.tagline")}
            logoUrl={known ? resolveAssetUrl(known.logoUrl) : null}
          />

          <Rise ready={headerReady} className="-mt-12 px-5">
            <View
              className="rounded-3xl border border-line bg-surface p-6"
              style={{ shadowColor: "#0B1B3F", shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 6 }}
            >
              <OfflineBanner />
              <AppText accessibilityRole="header" className="text-2xl font-extrabold text-ink">
                {t("auth.signInTitle")}
              </AppText>
              <AppText variant="muted" className="mb-6 mt-1">
                {t("auth.signInSubtitle")}
              </AppText>

              {notice || error ? (
                <View
                  accessibilityRole="alert"
                  className={
                    error
                      ? "mb-5 flex-row gap-2.5 rounded-xl border border-bad/30 bg-bad-soft p-3.5"
                      : "mb-5 flex-row gap-2.5 rounded-xl border border-info/30 bg-info-soft p-3.5"
                  }
                >
                  {error ? <AlertCircle size={18} color={colors.danger} /> : <Info size={18} color={colors.info} />}
                  <AppText variant="body" className={error ? "flex-1 text-sm font-semibold text-bad" : "flex-1 text-sm text-info"}>
                    {error ?? notice}
                  </AppText>
                </View>
              ) : null}

              <View className="gap-4">
                <Controller
                  control={control}
                  name="identifier"
                  render={({ field }) => (
                    <TextField
                      label={t("auth.identifier")}
                      icon={UserRound}
                      hint={t("auth.identifierHint")}
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={errors.identifier?.message}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="username"
                      textContentType="username"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                      submitBehavior="submit"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="password"
                  render={({ field }) => (
                    <TextField
                      ref={passwordRef}
                      label={t("auth.password")}
                      icon={LockKeyhole}
                      password
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={errors.password?.message}
                      autoComplete="current-password"
                      textContentType="password"
                      returnKeyType="go"
                      onSubmitEditing={() => onSubmit()}
                    />
                  )}
                />

                {showCode || savedCode ? (
                  <Controller
                    control={control}
                    name="schoolCode"
                    render={({ field }) => (
                      <TextField
                        label={t("auth.schoolCode")}
                        icon={School}
                        hint={t("auth.schoolCodeHint")}
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={errors.schoolCode?.message}
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                    )}
                  />
                ) : (
                  <Pressable accessibilityRole="button" onPress={() => setShowCode(true)} className="min-h-11 flex-row items-center gap-2 self-start">
                    <School size={16} color={colors.brand} />
                    <AppText className="text-sm font-semibold text-brand-ink">{t("auth.showSchoolCode")}</AppText>
                  </Pressable>
                )}

                <Button title={t("auth.signIn")} icon={LogIn} loading={isSubmitting} onPress={() => onSubmit()} fullWidth className="mt-1" />
              </View>
            </View>
          </Rise>

          <View className="mt-5 flex-row gap-2.5 px-7">
            <KeyRound size={16} color={colors.subtle} style={{ marginTop: 2 }} />
            <AppText variant="caption" className="flex-1">
              {t("auth.forgot")}
            </AppText>
          </View>

          {known ? (
            <View className="mt-8 flex-row items-center justify-center gap-2" accessible accessibilityLabel={t("brand.name")}>
              <BrandLogo variant="mark" width={30} />
              <AppText variant="caption" className="font-semibold">
                {t("brand.name")}
              </AppText>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

/** The form card rises into place as the header lands (after the launch animation). */
const Rise = ({ children, className, ready }: { children: ReactNode; className?: string; ready: boolean }) => {
  const introDone = useIntroDone();
  const reduceMotion = useReduceMotion();
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!ready || !introDone || reduceMotion === null) return;
    if (reduceMotion) {
      value.setValue(1);
      return;
    }
    const run = Animated.timing(value, { toValue: 1, delay: 380, duration: 560, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    run.start();
    return () => run.stop();
  }, [ready, introDone, reduceMotion, value]);
  return (
    <Animated.View className={className} style={{ opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }] }}>
      {children}
    </Animated.View>
  );
};
