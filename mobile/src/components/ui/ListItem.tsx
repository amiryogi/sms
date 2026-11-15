import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Image } from "expo-image";
import { useTheme } from "@/theme/ThemeProvider";
import { initials } from "@/utils/format";
import { cn } from "./cn";
import { AppText } from "./primitives";
import { Text } from "./Text";

const ICON_TONES = {
  brand: "bg-brand-soft",
  success: "bg-ok-soft",
  warning: "bg-warn-soft",
  danger: "bg-bad-soft",
  info: "bg-info-soft",
  neutral: "bg-sunken",
} as const;

/** A row in a Sheet. With onPress it shows a chevron and is a button for screen readers. */
export const ListItem = ({
  title,
  subtitle,
  meta,
  left,
  right,
  icon: Icon,
  iconTone = "brand",
  onPress,
  className,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  left?: ReactNode;
  right?: ReactNode;
  icon?: LucideIcon;
  iconTone?: keyof typeof ICON_TONES;
  onPress?: () => void;
  className?: string;
  accessibilityLabel?: string;
}) => {
  const { colors } = useTheme();
  const iconColor = { brand: colors.brand, success: colors.ok, warning: colors.warn, danger: colors.bad, info: colors.info, neutral: colors.muted }[iconTone];
  const body = (
    <>
      {left ??
        (Icon ? (
          <View className={cn("h-11 w-11 items-center justify-center rounded-xl", ICON_TONES[iconTone])}>
            <Icon size={20} color={iconColor} strokeWidth={2} />
          </View>
        ) : null)}
      <View className="flex-1 gap-0.5">
        <AppText className="font-semibold" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="muted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
        {meta ? <AppText variant="caption">{meta}</AppText> : null}
      </View>
      {right}
      {onPress ? <ChevronRight size={18} color={colors.subtle} /> : null}
    </>
  );
  const base = cn("min-h-16 flex-row items-center gap-3.5 px-4 py-3", className);
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, meta].filter(Boolean).join(", ")}
      onPress={onPress}
      className={cn(base, "active:bg-sunken")}
    >
      {body}
    </Pressable>
  ) : (
    <View className={base} accessible accessibilityLabel={accessibilityLabel}>
      {body}
    </View>
  );
};

/** A photo, or the person's initials on the brand colour. */
export const Avatar = ({ name, uri, size = 44 }: { name: string; uri?: string | null; size?: number }) => {
  const { brand, onBrand } = useTheme();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityLabel={name}
      />
    );
  }
  return (
    <View accessibilityLabel={name} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand[600] }} className="items-center justify-center">
      <Text style={{ color: onBrand, fontSize: size * 0.38 }} className="font-bold">
        {initials(name) || "?"}
      </Text>
    </View>
  );
};
