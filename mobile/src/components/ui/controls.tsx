import { Pressable, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "./cn";
import { AppText, Card, type Tone } from "./primitives";

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
  <View accessibilityRole="tablist" accessibilityLabel={label} className="flex-row rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
    {options.map((o) => {
      const active = o.value === value;
      return (
        <Pressable
          key={o.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          onPress={() => onChange(o.value)}
          className={cn("min-h-10 flex-1 items-center justify-center rounded-md px-2", active && "bg-white shadow-sm dark:bg-slate-950")}
        >
          <AppText
            variant="label"
            numberOfLines={1}
            className={active ? "text-slate-900 dark:text-slate-50" : "text-slate-500 dark:text-slate-400"}
          >
            {o.label}
          </AppText>
        </Pressable>
      );
    })}
  </View>
);

/** Horizontally scrollable choice chips (class, section, child, month…). */
export const Chip = ({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: !!selected }}
    onPress={onPress}
    className={cn(
      "min-h-10 justify-center rounded-full border px-4",
      selected
        ? "border-brand-600 bg-brand-600"
        : "border-slate-300 bg-white active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:active:bg-slate-800",
    )}
  >
    <ChipText label={label} selected={selected} />
  </Pressable>
);

const ChipText = ({ label, selected }: { label: string; selected?: boolean }) => {
  const { onBrand } = useTheme();
  return (
    <AppText variant="label" style={selected ? { color: onBrand } : undefined}>
      {label}
    </AppText>
  );
};

const STAT_TONE: Record<Tone, string> = {
  neutral: "bg-slate-100 dark:bg-slate-800",
  brand: "bg-brand-50 dark:bg-brand-950",
  success: "bg-emerald-50 dark:bg-emerald-950",
  warning: "bg-amber-50 dark:bg-amber-950",
  danger: "bg-red-50 dark:bg-red-950",
  info: "bg-sky-50 dark:bg-sky-950",
};

/** A figure with a label, for dashboards. Keep to a few per screen. */
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
  const iconColor = {
    neutral: colors.muted,
    brand: colors.brand,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.info,
  }[tone];
  return (
    <Card className={cn("flex-1 gap-2", className)} accessible accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ""}`}>
      {Icon ? (
        <View className={cn("h-9 w-9 items-center justify-center rounded-lg", STAT_TONE[tone])}>
          <Icon size={18} color={iconColor} />
        </View>
      ) : null}
      <AppText variant="caption">{label}</AppText>
      <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      {hint ? <AppText variant="caption">{hint}</AppText> : null}
    </Card>
  );
};
