import type { ReactNode } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { School } from "lucide-react-native";
import { Text } from "@/components/ui";
import { useUser } from "@/contexts/AuthContext";
import { NotificationBell } from "@/features/notifications/NotificationsScreen";
import { HeroAvatar } from "./HeroAvatar";
import { useTheme } from "@/theme/ThemeProvider";
import { resolveAssetUrl } from "@/utils/assets";
import { formatAdLong, fullName } from "@/utils/format";
import { adToBs, BS_MONTHS, kathmanduToday } from "@/utils/nepaliDate";

const greeting = (hour: number) => (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");

/**
 * The top of every home screen, in the school's colour. School life runs on
 * the Bikram Sambat calendar, so today's BS date is the headline; the AD date
 * and weekday sit under it. Full-bleed: it cancels the Screen's padding. The
 * status-bar strip above it (and the status-bar style) is the tab's header,
 * HomeStatusBand.
 */
export const HomeHeader = ({ subtitle, children }: { subtitle?: string | null; children?: ReactNode }) => {
  const user = useUser();
  const { brand, onBrand } = useTheme();
  const today = kathmanduToday();
  const bs = adToBs(`${today}T00:00:00.000Z`);
  const bsDay = bs ? `${bs.day} ${BS_MONTHS[bs.month - 1]}` : null;
  const adLine = formatAdLong(today);
  const logo = resolveAssetUrl(user.school.logoUrl);
  const soft = { color: onBrand, opacity: 0.9 };

  return (
    <View style={{ backgroundColor: brand[600] }} className="-mx-4 -mt-4 mb-5 rounded-b-3xl px-5 pb-6 pt-2">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
          {logo ? (
            <Image source={{ uri: logo }} style={{ width: 34, height: 34 }} contentFit="contain" accessibilityLabel={user.school.name} />
          ) : (
            <School size={20} color={brand[600]} />
          )}
        </View>
        <Text numberOfLines={1} style={soft} className="flex-1 text-sm font-semibold">
          {user.school.name}
        </Text>
        <NotificationBell color={onBrand} />
      </View>

      <View className="mt-6" accessible accessibilityLabel={`Today, ${bs ? `${bsDay} ${bs.year} BS, ` : ""}${adLine}`}>
        {bsDay ? (
          <Text style={{ color: onBrand }} className="text-4xl font-extrabold">
            {bsDay}
          </Text>
        ) : null}
        <Text style={soft} className="text-base font-medium">
          {bs ? `${bs.year} BS, ` : ""}
          {adLine}
        </Text>
      </View>

      <View className="mt-5 flex-row items-center gap-4">
        <HeroAvatar name={fullName(user)} uri={resolveAssetUrl(user.avatarUrl)} />
        <View className="flex-1">
          <Text accessibilityRole="header" style={{ color: onBrand }} className="text-xl font-bold" numberOfLines={2}>
            {greeting(new Date().getHours())}, {user.firstName}
          </Text>
          {subtitle ? (
            <Text style={soft} numberOfLines={2} className="text-sm">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {children ? <View className="mt-4">{children}</View> : null}
    </View>
  );
};

/** A line and a bar on the brand colour, for the one number a home screen leads with. */
export const HeroMeter = ({ text, percent, label }: { text: string; percent: number; label?: string }) => {
  const { onBrand, onBrandIsLight } = useTheme();
  const pct = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  // Translucent on-brand layers: they work over any school colour.
  const veil = onBrandIsLight ? "255,255,255" : "0,0,0";
  return (
    <View className="gap-2 rounded-2xl p-3.5" style={{ backgroundColor: `rgba(${veil},0.14)` }} accessible accessibilityLabel={label ?? text}>
      <Text style={{ color: onBrand }} className="text-base font-semibold">
        {text}
      </Text>
      <View className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: `rgba(${veil},0.22)` }}>
        <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: onBrand }} />
      </View>
    </View>
  );
};
