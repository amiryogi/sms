import { Pressable, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "./cn";
import { AppText, type Tone } from "./primitives";

/** A row of mutually exclusive options (tabs inside a screen). */
export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) => (
  <View accessibilityRole="tablist" accessibilityLabel={label} className="flex-row rounded-2xl bg-sunken p-1">
    {options.map((o) => {
      const active = o.value === value;
      return (
        <Pressable
          key={o.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          onPress={() => onChange(o.value)}
          className={cn("min-h-11 flex-1 items-center justify-center rounded-xl px-2", active && "bg-surface")}
        >
          <AppText numberOfLines={1} className={cn("text-sm", active ? "font-bold text-ink" : "font-semibold text-ink-muted")}>
            {o.label}
          </AppText>
        </Pressable>
      );
    })}
  </View>
);

/** Choice chips (class, section, child, month…). */
export const Chip = ({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) => {
  const { onBrand } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      className={cn("min-h-11 justify-center rounded-full border px-4", selected ? "border-brand-600 bg-brand-600" : "border-line-strong bg-surface active:bg-sunken")}
    >
      <AppText className="text-sm font-semibold" style={selected ? { color: onBrand } : undefined}>
        {label}
      </AppText>
    </Pressable>
  );
};

const STAT_TONE: Record<Tone, string> = {
  neutral: "bg-sunken",
  brand: "bg-brand-soft",
  success: "bg-ok-soft",
  warning: "bg-warn-soft",
  danger: "bg-bad-soft",
  info: "bg-info-soft",
};

/**
 * A figure with its label. The figure leads; the label and hint stay quiet.
 * Use a few per screen, never as decoration.
 */
export const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  className,
}: {
  label: string;
  value: string;
  hint?: string | null;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}) => {
  const { colors } = useTheme();
  const iconColor = { neutral: colors.muted, brand: colors.brand, success: colors.ok, warning: colors.warn, danger: colors.bad, info: colors.info }[tone];
  return (
    <View className={cn("flex-1 gap-1 rounded-2xl border border-line bg-surface p-4", className)} accessible accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ""}`}>
      <View className="flex-row items-center gap-2">
        {Icon ? (
          <View className={cn("h-7 w-7 items-center justify-center rounded-lg", STAT_TONE[tone])}>
            <Icon size={15} color={iconColor} strokeWidth={2.2} />
          </View>
        ) : null}
        <AppText variant="label" numberOfLines={1} className="flex-1">
          {label}
        </AppText>
      </View>
      <AppText numberOfLines={1} adjustsFontSizeToFit className="mt-1 text-2xl font-extrabold text-ink">
        {value}
      </AppText>
      {hint ? (
        <AppText variant="caption" numberOfLines={2}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
};
