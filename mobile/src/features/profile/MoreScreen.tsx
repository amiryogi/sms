import { Alert, View } from "react-native";
import { router, type Href } from "expo-router";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Info, KeyRound, LogOut, type LucideIcon } from "lucide-react-native";
import { AppText, Avatar, Card, Divider, ListItem, Screen, SectionHeader, SegmentedControl } from "@/components/ui";
import { useAuth, useUser } from "@/contexts/AuthContext";
import { useTheme, type SchemePreference } from "@/theme/ThemeProvider";
import { resolveAssetUrl } from "@/utils/assets";
import { fullName } from "@/utils/format";
import { AREA_LABELS, areasFor, roleLabel, type RoleArea } from "@/utils/roles";

export type MoreLink = { title: string; subtitle?: string; icon: LucideIcon; href: Href };

/**
 * The last tab of every role area: the person, links to the area's secondary
 * screens, appearance, password, switching area (several roles) and sign-out.
 */
export const MoreScreen = ({ area, links = [] }: { area: RoleArea; links?: MoreLink[] }) => {
  const { t } = useTranslation();
  const user = useUser();
  const { logout } = useAuth();
  const { preference, setPreference } = useTheme();
  const name = fullName(user);
  const otherAreas = areasFor(user.roles).filter((a) => a !== area);

  const confirmSignOut = () =>
    Alert.alert(t("common.signOut"), t("profile.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.signOut"), style: "destructive", onPress: () => logout() },
    ]);

  return (
    <Screen>
      <Card className="flex-row items-center gap-4">
        <Avatar name={name} uri={resolveAssetUrl(user.avatarUrl)} size={56} />
        <View className="flex-1 gap-0.5">
          <AppText variant="heading" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="muted" numberOfLines={1}>
            {user.roles.map(roleLabel).join(", ")}
            {user.username ? ` · ${user.username}` : ""}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {user.school.name}
          </AppText>
        </View>
      </Card>

      {links.length ? (
        <>
          <SectionHeader title={AREA_LABELS[area]} />
          <Card className="p-0">
            {links.map((l, i) => (
              <View key={String(l.href)}>
                {i > 0 ? <Divider className="ml-16" /> : null}
                <ListItem title={l.title} subtitle={l.subtitle} icon={l.icon} onPress={() => router.push(l.href)} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {otherAreas.length ? (
        <>
          <SectionHeader title={t("profile.switchArea")} />
          <Card className="p-0">
            {otherAreas.map((a, i) => (
              <View key={a}>
                {i > 0 ? <Divider className="ml-16" /> : null}
                <ListItem title={AREA_LABELS[a]} icon={ArrowLeftRight} onPress={() => router.replace(`/${a}`)} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title={t("profile.appearance")} />
      <SegmentedControl<SchemePreference>
        label={t("profile.appearance")}
        value={preference}
        onChange={setPreference}
        options={[
          { value: "system", label: t("profile.system") },
          { value: "light", label: t("profile.light") },
          { value: "dark", label: t("profile.dark") },
        ]}
      />

      <SectionHeader title={t("profile.account")} />
      <Card className="p-0">
        <ListItem title={t("password.changeTitle")} icon={KeyRound} onPress={() => router.push("/change-password")} />
        <Divider className="ml-16" />
        <ListItem title={t("profile.about")} icon={Info} onPress={() => router.push("/shared/about")} />
        <Divider className="ml-16" />
        <ListItem title={t("common.signOut")} icon={LogOut} onPress={confirmSignOut} />
      </Card>

      <AppText variant="caption" className="mt-6 text-center">
        {t("profile.version")} {Constants.expoConfig?.version ?? "—"}
      </AppText>
    </Screen>
  );
};
