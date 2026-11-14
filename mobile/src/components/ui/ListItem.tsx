import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Image } from "expo-image";
import { useTheme } from "@/theme/ThemeProvider";
import { initials } from "@/utils/format";
import { cn } from "./cn";
import { AppText } from "./primitives";

/** A row in a list. With onPress it shows a chevron and is a button for screen readers. */
export const ListItem = ({
  title,
  subtitle,
  meta,
  left,
  right,
  icon: Icon,
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
  onPress?: () => void;
  className?: string;
  accessibilityLabel?: string;
}) => {
  const { colors } = useTheme();
  const body = (
    <>
      {left ??
        (Icon ? (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950">
            <Icon size={20} color={colors.brand} />
          </View>
        ) : null)}
      <View className="flex-1 gap-0.5">
        <AppText variant="body" className="font-medium" numberOfLines={2}>
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
  const base = cn("min-h-14 flex-row items-center gap-3 px-4 py-3", className);
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, meta].filter(Boolean).join(", ")}
      onPress={onPress}
      className={cn(base, "active:bg-slate-50 dark:active:bg-slate-800")}
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
    <View
      accessibilityLabel={name}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand[600] }}
      className="items-center justify-center"
    >
      <AppText style={{ color: onBrand, fontSize: size * 0.38 }} className="font-semibold">
        {initials(name) || "?"}
      </AppText>
    </View>
  );
};
