import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { router, Stack } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { AlertCircle, KeyRound } from "lucide-react-native";
import { z } from "zod";
import type { ApiFailure } from "@/api/errors";
import { AppText, Button, Screen, TextField } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme/ThemeProvider";

/** Same rule as the backend's changePasswordValidation (auth.routes.js). */
export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

type Form = { currentPassword: string; newPassword: string; confirmPassword: string };

/**
 * Forced (after an admin-set password: no way back, only sign out) or
 * voluntary (from Profile: afterwards every session ends, so the user signs in again).
 */
export const ChangePasswordScreen = () => {
  const { t } = useTranslation();
  const { user, changePassword, logout } = useAuth();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const forced = !!user?.mustChangePassword;

  const schema = z
    .object({
      currentPassword: z.string().min(1, t("auth.passwordRequired")),
      newPassword: z.string().min(8, t("password.rules")).regex(PASSWORD_RULE, t("password.rules")),
      confirmPassword: z.string(),
    })
    .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: t("password.mismatch") })
    .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: t("password.same") });

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    try {
      const result = await changePassword(v.currentPassword, v.newPassword);
      // Forced: the guard opens the app; go home. Voluntary: signed out, the guard shows sign-in.
      if (!result.signedOut) router.replace("/");
    } catch (e) {
      setError((e as ApiFailure).message);
    }
  });

  return (
    <Screen edges={forced ? ["top", "left", "right"] : ["left", "right"]}>
      <Stack.Screen options={{ headerShown: !forced, title: t("password.changeTitle"), gestureEnabled: !forced }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="mb-6 gap-2">
          <KeyRound size={36} color={colors.brand} />
          <AppText variant="title" accessibilityRole="header">
            {forced ? t("password.forcedTitle") : t("password.changeTitle")}
          </AppText>
          <AppText variant="muted">{forced ? t("password.forcedBody") : t("password.changeBody")}</AppText>
        </View>

        {error ? (
          <View accessibilityRole="alert" className="mb-4 flex-row gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-950">
            <AlertCircle size={18} color={colors.danger} />
            <AppText className="flex-1 text-sm">{error}</AppText>
          </View>
        ) : null}

        <View className="gap-4">
          <Controller
            control={control}
            name="currentPassword"
            render={({ field }) => (
              <TextField
                label={forced ? t("password.currentForced") : t("password.current")}
                password
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.currentPassword?.message}
                autoComplete="current-password"
                textContentType="password"
              />
            )}
          />
          <Controller
            control={control}
            name="newPassword"
            render={({ field }) => (
              <TextField
                label={t("password.new")}
                password
                hint={t("password.rules")}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.newPassword?.message}
                autoComplete="new-password"
                textContentType="newPassword"
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field }) => (
              <TextField
                label={t("password.confirm")}
                password
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.confirmPassword?.message}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={() => onSubmit()}
              />
            )}
          />
          <Button title={t("password.submit")} loading={isSubmitting} onPress={() => onSubmit()} fullWidth className="mt-2" />
          {forced ? <Button title={t("common.signOut")} variant="ghost" onPress={logout} fullWidth /> : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};
