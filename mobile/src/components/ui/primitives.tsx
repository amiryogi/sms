import type { ComponentRef, ReactNode, Ref } from "react";
import { ActivityIndicator, Pressable, Text, View, type PressableProps, type TextProps, type ViewProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "./cn";

/* ------------------------------------------------------------------ text */

const TEXT_VARIANTS = {
  display: "text-3xl font-bold text-slate-900 dark:text-slate-50",
  title: "text-2xl font-bold text-slate-900 dark:text-slate-50",
  heading: "text-lg font-semibold text-slate-900 dark:text-slate-50",
  body: "text-base text-slate-800 dark:text-slate-200",
  label: "text-sm font-medium text-slate-700 dark:text-slate-300",
  muted: "text-sm text-slate-500 dark:text-slate-400",
  caption: "text-xs text-slate-500 dark:text-slate-400",
} as const;

export type TextVariant = keyof typeof TEXT_VARIANTS;

export const AppText = ({ variant = "body", className, ...props }: TextProps & { variant?: TextVariant; className?: string }) => (
  <Text className={cn(TEXT_VARIANTS[variant], className)} {...props} />
);

/* ---------------------------------------------------------------- button */

const BUTTON_VARIANTS = {
  primary: "bg-brand-600 active:bg-brand-700",
  secondary: "bg-white border border-slate-300 active:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:active:bg-slate-800",
  ghost: "bg-transparent active:bg-slate-100 dark:active:bg-slate-800",
  danger: "bg-red-600 active:bg-red-700",
} as const;

const BUTTON_SIZES = {
  md: "min-h-12 px-5 rounded-lg",
  sm: "min-h-10 px-3.5 rounded-md",
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
  const fg = variant === "primary" ? onBrand : variant === "danger" ? "#ffffff" : colors.text;
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      className={cn(
        "flex-row items-center justify-center gap-2",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && "w-full",
        isDisabled && "opacity-50",
        className,
      )}
      {...props}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : Icon ? <Icon size={18} color={fg} /> : null}
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
      hitSlop={8}
      onPress={onPress}
      disabled={disabled}
      className={cn("h-11 w-11 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800", disabled && "opacity-40", className)}
    >
      <Icon size={22} color={color ?? colors.text} />
    </Pressable>
  );
};

/* ------------------------------------------------------------------ card */

export const Card = ({ className, children, ...props }: ViewProps & { className?: string; children?: ReactNode }) => (
  <View
    className={cn("rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900", className)}
    {...props}
  >
    {children}
  </View>
);

/** A card that opens something. */
export const PressableCard = ({ className, children, ...props }: PressableProps & { className?: string; children?: ReactNode }) => (
  <Pressable
    accessibilityRole="button"
    className={cn(
      "rounded-xl border border-slate-200 bg-white p-4 active:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:active:bg-slate-800",
      className,
    )}
    {...props}
  >
    {children}
  </Pressable>
);

export const SectionHeader = ({ title, action }: { title: string; action?: ReactNode }) => (
  <View className="mb-2 mt-5 flex-row items-center justify-between px-1">
    <AppText variant="label" className="uppercase tracking-wide text-slate-500 dark:text-slate-400" accessibilityRole="header">
      {title}
    </AppText>
    {action}
  </View>
);

export const Divider = ({ className }: { className?: string }) => (
  <View className={cn("h-px bg-slate-200 dark:bg-slate-800", className)} />
);

/* ----------------------------------------------------------------- badge */

const BADGE_TONES = {
  neutral: "bg-slate-100 dark:bg-slate-800",
  brand: "bg-brand-50 dark:bg-brand-950",
  success: "bg-emerald-50 dark:bg-emerald-950",
  warning: "bg-amber-50 dark:bg-amber-950",
  danger: "bg-red-50 dark:bg-red-950",
  info: "bg-sky-50 dark:bg-sky-950",
} as const;

const BADGE_TEXT = {
  neutral: "text-slate-700 dark:text-slate-300",
  brand: "text-brand-700 dark:text-brand-300",
  success: "text-emerald-700 dark:text-emerald-300",
  warning: "text-amber-800 dark:text-amber-300",
  danger: "text-red-700 dark:text-red-300",
  info: "text-sky-700 dark:text-sky-300",
} as const;

export type Tone = keyof typeof BADGE_TONES;

export const Badge = ({ label, tone = "neutral", className }: { label: string; tone?: Tone; className?: string }) => (
  <View className={cn("self-start rounded-full px-2.5 py-0.5", BADGE_TONES[tone], className)}>
    <Text className={cn("text-xs font-semibold", BADGE_TEXT[tone])}>{label}</Text>
  </View>
);

/* -------------------------------------------------------------- progress */

export const ProgressBar = ({ value, tone = "brand", label }: { value: number; tone?: "brand" | "success" | "warning" | "danger"; label?: string }) => {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const fill = { brand: "bg-brand-600", success: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-red-500" }[tone];
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
    >
      <View className={cn("h-full rounded-full", fill)} style={{ width: `${pct}%` }} />
    </View>
  );
};
