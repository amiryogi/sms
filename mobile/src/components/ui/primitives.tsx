import type { ComponentRef, ReactNode, Ref } from "react";
import { ActivityIndicator, Pressable, View, type PressableProps, type TextProps, type ViewProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "./cn";
import { Text } from "./Text";

/* ------------------------------------------------------------------ text */

const TEXT_VARIANTS = {
  /** The one big moment per screen (the date on home, a balance). */
  display: "text-4xl font-extrabold text-ink",
  title: "text-2xl font-bold text-ink",
  heading: "text-lg font-semibold text-ink",
  body: "text-base text-ink",
  label: "text-sm font-semibold text-ink-muted",
  muted: "text-sm text-ink-muted",
  caption: "text-xs text-ink-subtle",
} as const;

export type TextVariant = keyof typeof TEXT_VARIANTS;

export const AppText = ({ variant = "body", className, ...props }: TextProps & { variant?: TextVariant; className?: string }) => (
  <Text className={cn(TEXT_VARIANTS[variant], className)} {...props} />
);

/* ---------------------------------------------------------------- button */

const BUTTON_VARIANTS = {
  primary: "bg-brand-600 active:opacity-85",
  secondary: "bg-surface border border-line-strong active:bg-sunken",
  ghost: "bg-transparent active:bg-sunken",
  danger: "bg-bad-soft active:opacity-80",
} as const;

const BUTTON_SIZES = {
  md: "min-h-14 px-6 rounded-2xl",
  sm: "min-h-11 px-4 rounded-xl",
} as const;

export type ButtonProps = Omit<PressableProps, "children"> & {
  title: string;
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  loading?: boolean;
  icon?: LucideIcon;
  className?: string;
  fullWidth?: boolean;
  ref?: Ref<ComponentRef<typeof Pressable>>;
};

export const Button = ({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  icon: Icon,
  className,
  fullWidth,
  ref,
  ...props
}: ButtonProps) => {
  const { onBrand, colors } = useTheme();
  const isDisabled = disabled || loading;
  const fg = variant === "primary" ? onBrand : variant === "danger" ? colors.bad : variant === "ghost" ? colors.brand : colors.ink;
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      className={cn("flex-row items-center justify-center gap-2", BUTTON_VARIANTS[variant], BUTTON_SIZES[size], fullWidth && "w-full", isDisabled && "opacity-45", className)}
      {...props}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : Icon ? <Icon size={size === "sm" ? 17 : 19} color={fg} strokeWidth={2.2} /> : null}
      <Text style={{ color: fg }} className={cn("font-semibold", size === "sm" ? "text-sm" : "text-base")}>
        {title}
      </Text>
    </Pressable>
  );
};

/** A round icon-only button with a label for screen readers. */
export const IconButton = ({
  icon: Icon,
  label,
  onPress,
  disabled,
  className,
  color,
}: {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
  color?: string;
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      disabled={disabled}
      className={cn("h-11 w-11 items-center justify-center rounded-full active:bg-sunken", disabled && "opacity-35", className)}
    >
      <Icon size={22} color={color ?? colors.ink} strokeWidth={2} />
    </Pressable>
  );
};

/* ------------------------------------------------------- surfaces */

/** A plain surface. Content inside sets its own spacing via className. */
export const Card = ({ className, children, ...props }: ViewProps & { className?: string; children?: ReactNode }) => (
  <View className={cn("overflow-hidden rounded-2xl border border-line bg-surface p-4", className)} {...props}>
    {children}
  </View>
);

/** A surface that opens something. */
export const PressableCard = ({ className, children, ...props }: PressableProps & { className?: string; children?: ReactNode }) => (
  <Pressable accessibilityRole="button" className={cn("rounded-2xl border border-line bg-surface p-4 active:bg-sunken", className)} {...props}>
    {children}
  </Pressable>
);

/**
 * A grouped list, like a page of the school register: rows separated by
 * hairlines inside one surface (use instead of a card per row).
 */
export const Sheet = ({ className, children, ...props }: ViewProps & { className?: string; children?: ReactNode }) => (
  <View className={cn("overflow-hidden rounded-2xl border border-line bg-surface", className)} {...props}>
    {children}
  </View>
);

/** Section title: sentence case, the content's own name. */
export const SectionHeader = ({ title, action }: { title: string; action?: ReactNode }) => (
  <View className="mb-2 mt-7 flex-row items-end justify-between px-1">
    <Text accessibilityRole="header" className="text-lg font-bold text-ink">
      {title}
    </Text>
    {action}
  </View>
);

/** A text link for a section's action ("See all"). */
export const LinkText = ({ title, onPress }: { title: string; onPress: () => void }) => (
  <Pressable accessibilityRole="link" hitSlop={10} onPress={onPress} className="min-h-11 justify-center">
    <Text className="text-sm font-semibold text-brand-ink">{title}</Text>
  </Pressable>
);

/**
 * A hairline between rows. `inset` lines it up with the row text of a
 * ListItem: true for the 44 px icon tile, or the width of the leading element
 * (an avatar's size). ListItem: 16 px padding, then the element, then a 14 px gap.
 */
export const Divider = ({ className, inset }: { className?: string; inset?: boolean | number }) => (
  <View
    className={cn("h-px bg-line", className)}
    style={inset ? { marginLeft: 16 + (inset === true ? 44 : inset) + 14 } : undefined}
  />
);

/* ----------------------------------------------------------------- badge */

const BADGE_TONES = {
  neutral: "border-line-strong bg-sunken",
  brand: "border-brand-ink/30 bg-brand-soft",
  success: "border-ok/30 bg-ok-soft",
  warning: "border-warn/30 bg-warn-soft",
  danger: "border-bad/30 bg-bad-soft",
  info: "border-info/30 bg-info-soft",
} as const;

const BADGE_TEXT = {
  neutral: "text-ink-muted",
  brand: "text-brand-ink",
  success: "text-ok",
  warning: "text-warn",
  danger: "text-bad",
  info: "text-info",
} as const;

export type Tone = keyof typeof BADGE_TONES;

/** A status, drawn like a rubber stamp on a register: outlined, tinted. */
export const Badge = ({ label, tone = "neutral", className }: { label: string; tone?: Tone; className?: string }) => (
  <View className={cn("self-start rounded-md border px-2 py-0.5", BADGE_TONES[tone], className)}>
    <Text className={cn("text-xs font-bold", BADGE_TEXT[tone])}>{label}</Text>
  </View>
);

/* -------------------------------------------------------------- progress */

export const ProgressBar = ({ value, tone = "brand", label }: { value: number; tone?: "brand" | "success" | "warning" | "danger"; label?: string }) => {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const fill = { brand: "bg-brand-600", success: "bg-ok", warning: "bg-warn-solid", danger: "bg-bad" }[tone];
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      className="h-2.5 w-full overflow-hidden rounded-full bg-sunken"
    >
      <View className={cn("h-full rounded-full", fill)} style={{ width: `${pct}%` }} />
    </View>
  );
};
