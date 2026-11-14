import { useEffect, useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, GraduationCap, Info, LogIn } from "lucide-react-native";
import { z } from "zod";
import type { ApiFailure } from "@/api/errors";
import { schoolService } from "@/api/services/school";
import { AppText, Button, OfflineBanner, TextField } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
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

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
      <OfflineBanner />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8" keyboardShouldPersistTaps="handled">
          <View className="mb-8 items-center gap-3">
            {logo ? (
              <Image source={{ uri: logo }} style={{ width: 80, height: 80 }} contentFit="contain" accessibilityLabel={school?.name} />
            ) : (
              <View style={{ backgroundColor: brand[600] }} className="h-20 w-20 items-center justify-center rounded-2xl">
                <GraduationCap size={40} color={onBrand} />
              </View>
            )}
            <AppText variant="title" className="text-center">
              {school?.name ?? "Vidyalaya SMS"}
            </AppText>
            {school?.tagline ? (
              <AppText variant="muted" className="text-center">
                {school.tagline}
              </AppText>
            ) : null}
          </View>

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
                  ? "mb-4 flex-row gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-950"
                  : "mb-4 flex-row gap-2 rounded-lg bg-sky-50 p-3 dark:bg-sky-950"
              }
            >
              {error ? <AlertCircle size={18} color={colors.danger} /> : <Info size={18} color={colors.info} />}
              <AppText variant="body" className="flex-1 text-sm">
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
                <AppText variant="label" className="text-brand-700 dark:text-brand-300">
                  {t("auth.showSchoolCode")}
                </AppText>
              </Pressable>
            )}

            <Button title={t("auth.signIn")} icon={LogIn} loading={isSubmitting} onPress={() => onSubmit()} fullWidth className="mt-2" />

            <AppText variant="caption" className="mt-2 text-center">
              {t("auth.forgot")}
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
