import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CloudOff, ServerCrash, ShieldX } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { AppText, Button } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme/ThemeProvider";

const Frame = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaView className="flex-1 items-center justify-center gap-3 bg-slate-50 px-8 dark:bg-slate-950">{children}</SafeAreaView>
);

/** The build has no (or an insecure) API URL: nothing can work, so say so. */
export const ConfigError = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Frame>
      <ServerCrash size={44} color={colors.danger} />
      <AppText variant="heading" className="text-center">
        App not configured
      </AppText>
      <AppText variant="muted" className="text-center">
        {t("auth.notConfigured")}
      </AppText>
    </Frame>
  );
};

/** Tokens exist but the server could not be reached: the user is still signed in. */
export const RestoreError = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { restoreError, retryRestore, signOutLocally } = useAuth();
  return (
    <Frame>
      <CloudOff size={44} color={colors.muted} />
      <AppText variant="heading" className="text-center">
        {t("auth.restoreFailed")}
      </AppText>
      {restoreError ? (
        <AppText variant="muted" className="text-center">
          {restoreError}
        </AppText>
      ) : null}
      <AppText variant="muted" className="text-center">
        {t("auth.restoreStillSignedIn")}
      </AppText>
      <View className="mt-4 w-full gap-3">
        <Button title={t("common.retry")} onPress={retryRestore} fullWidth />
        <Button title={t("common.signOut")} variant="secondary" onPress={() => signOutLocally()} fullWidth />
      </View>
    </Frame>
  );
};

/** Signed in, but with no role the app has an area for. */
export const NoAccess = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { logout } = useAuth();
  return (
    <Frame>
      <ShieldX size={44} color={colors.muted} />
      <AppText variant="heading" className="text-center">
        {t("auth.noAccessTitle")}
      </AppText>
      <AppText variant="muted" className="text-center">
        {t("auth.noAccessBody")}
      </AppText>
      <Button title={t("common.signOut")} variant="secondary" onPress={logout} className="mt-4" fullWidth />
    </Frame>
  );
};
