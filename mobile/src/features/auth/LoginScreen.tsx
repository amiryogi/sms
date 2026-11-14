import { useEffect, useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, Info, LogIn } from "lucide-react-native";
import { z } from "zod";
import type { ApiFailure } from "@/api/errors";
import { schoolService } from "@/api/services/school";
import { AppText, Button, OfflineBanner, Text, TextField, type TextInput } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLogo } from "@/features/brand/BrandLogo";
import { PREF_KEYS, readJson, writeJson } from "@/lib/storage";
import { useTheme } from "@/theme/ThemeProvider";
import { resolveAssetUrl } from "@/utils/assets";

type Form = { identifier: string; password: string; schoolCode: string };

export const LoginScreen = () => {
  const { t } = useTranslation();
  const { login, notice, clearNotice } = useAuth();
  const { colors, brand, onBrand, setBrandColor } = useTheme();
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

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

  const logo = resolveAssetUrl(school?.logoUrl);
  // A school code from an earlier sign-in brings the school's own band back.
  const schoolKnown = !!savedCode && (!!school || branding.isLoading);

  return (
    <View className="flex-1 bg-canvas">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="flex-grow pb-8" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
          {schoolKnown ? (
            // The school's colour band: the same face the home screen greets with.
            <View style={{ backgroundColor: brand[600], paddingTop: insets.top + 32 }} className="rounded-b-3xl px-6 pb-10">
              <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white">
                {logo ? (
                  <Image source={{ uri: logo }} style={{ width: 68, height: 68 }} contentFit="contain" accessibilityLabel={school?.name} />
                ) : (
                  <BrandLogo variant="mark" width={62} />
                )}
              </View>
              <Text style={{ color: onBrand }} className="mt-5 text-3xl font-extrabold">
                {school?.name ?? t("brand.name")}
              </Text>
              {school?.tagline ? (
                <Text style={{ color: onBrand, opacity: 0.9 }} className="mt-1 text-base">
                  {school.tagline}
                </Text>
              ) : null}
            </View>
          ) : (
            // No school on this phone yet: the product's own face, as the launch animation ends.
            <View style={{ paddingTop: insets.top + 36 }} className="items-center px-6 pb-2">
              <BrandLogo width={Math.min(width * 0.56, 230)} />
              <AppText variant="muted" className="mt-3 text-center text-base">
                {t("brand.tagline")}
              </AppText>
            </View>
          )}
          <OfflineBanner />

          <View className="px-6 pt-7">
            <AppText variant="heading" accessibilityRole="header">
              {t("auth.signInTitle")}
            </AppText>
            <AppText variant="muted" className="mb-5 mt-1">
              {t("auth.signInSubtitle")}
            </AppText>

            {notice || error ? (
              <View
                accessibilityRole="alert"
                className={
                  error
                    ? "mb-4 flex-row gap-2.5 rounded-xl border border-bad/30 bg-bad-soft p-3.5"
                    : "mb-4 flex-row gap-2.5 rounded-xl border border-info/30 bg-info-soft p-3.5"
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
                <Pressable accessibilityRole="button" onPress={() => setShowCode(true)} className="min-h-11 justify-center self-start">
                  <AppText variant="label" className="text-brand-ink">
                    {t("auth.showSchoolCode")}
                  </AppText>
                </Pressable>
              )}

              <Button title={t("auth.signIn")} icon={LogIn} loading={isSubmitting} onPress={() => onSubmit()} fullWidth className="mt-2" />

              <AppText variant="caption" className="mt-2 text-center">
                {t("auth.forgot")}
              </AppText>

              {schoolKnown ? (
                <View className="mt-8 flex-row items-center justify-center gap-2" accessible accessibilityLabel={t("brand.name")}>
                  <BrandLogo variant="mark" width={30} />
                  <AppText variant="caption" className="font-semibold">
                    {t("brand.name")}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
