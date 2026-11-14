import { Alert, View } from "react-native";
import { router, type Href } from "expo-router";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Info, KeyRound, LogOut, type LucideIcon } from "lucide-react-native";
import { AppText, Avatar, Divider, ListItem, Screen, SectionHeader, SegmentedControl, Sheet } from "@/components/ui";
import { useAuth, useUser } from "@/contexts/AuthContext";
import { useTheme, type SchemePreference } from "@/theme/ThemeProvider";
import { resolveAssetUrl } from "@/utils/assets";
import { fullName } from "@/utils/format";
import { AREA_LABELS, areasFor, roleLabel, type RoleArea } from "@/utils/roles";

export type MoreLink = { title: string; subtitle?: string; icon: LucideIcon; href: Href };

/** Rows in a Sheet, with the divider indented past the icon tile. */
const Rows = ({ children }: { children: React.ReactNode[] }) => (
  <Sheet>
    {children.map((child, i) => (
      <View key={i}>
        {i > 0 ? <Divider inset /> : null}
        {child}
      </View>
    ))}
  </Sheet>
);

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
      <View className="flex-row items-center gap-4 rounded-2xl border border-brand-ink/20 bg-brand-soft p-4">
        <Avatar name={name} uri={resolveAssetUrl(user.avatarUrl)} size={60} />
        <View className="flex-1 gap-0.5">
          <AppText className="text-xl font-bold text-ink" numberOfLines={2}>
            {name}
          </AppText>
          <AppText variant="label" numberOfLines={1}>
            {user.roles.map(roleLabel).join(", ")}
            {user.username ? `, ${user.username}` : ""}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {user.school.name}
          </AppText>
        </View>
      </View>

      {links.length ? (
        <>
          <SectionHeader title={AREA_LABELS[area]} />
          <Rows>
            {links.map((l) => (
              <ListItem key={String(l.href)} title={l.title} subtitle={l.subtitle} icon={l.icon} onPress={() => router.push(l.href)} />
            ))}
          </Rows>
        </>
      ) : null}

      {otherAreas.length ? (
        <>
          <SectionHeader title={t("profile.switchArea")} />
          <Rows>
            {otherAreas.map((a) => (
              <ListItem key={a} title={AREA_LABELS[a]} icon={ArrowLeftRight} iconTone="info" onPress={() => router.replace(`/${a}`)} />
            ))}
          </Rows>
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
      <Rows>
        {[
          <ListItem key="pw" title={t("password.changeTitle")} icon={KeyRound} iconTone="neutral" onPress={() => router.push("/change-password")} />,
          <ListItem key="about" title={t("profile.about")} icon={Info} iconTone="neutral" onPress={() => router.push("/shared/about")} />,
          <ListItem key="out" title={t("common.signOut")} icon={LogOut} iconTone="danger" onPress={confirmSignOut} />,
        ]}
      </Rows>

      <AppText variant="caption" className="mt-6 text-center">
        {t("profile.version")} {Constants.expoConfig?.version ?? "—"}
      </AppText>
    </Screen>
  );
};
