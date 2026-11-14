import { View } from "react-native";
import { Image } from "expo-image";
import { AppText } from "@/components/ui";
import { useUser } from "@/contexts/AuthContext";
import { resolveAssetUrl } from "@/utils/assets";
import { formatAd } from "@/utils/format";
import { formatBs, kathmanduToday } from "@/utils/nepaliDate";

const greeting = (hour: number) => (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");

/** Top of every dashboard: greeting, today in BS (and AD), and the school. */
export const HomeHeader = ({ subtitle }: { subtitle?: string | null }) => {
  const user = useUser();
  const today = kathmanduToday();
  const logo = resolveAssetUrl(user.school.logoUrl);
  return (
    <View className="mb-4 flex-row items-center gap-3">
      <View className="flex-1 gap-0.5">
        <AppText variant="caption">
          {formatBs(today)} · {formatAd(`${today}T00:00:00.000Z`)}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {greeting(new Date().getHours())}, {user.firstName}
        </AppText>
        <AppText variant="muted" numberOfLines={1}>
          {subtitle ?? user.school.name}
        </AppText>
      </View>
      {logo ? <Image source={{ uri: logo }} style={{ width: 44, height: 44 }} contentFit="contain" accessibilityLabel={user.school.name} /> : null}
    </View>
  );
};
