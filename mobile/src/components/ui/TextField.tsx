import { useState, type ComponentRef, type Ref } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "./cn";
import { AppText } from "./primitives";

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  /** Adds a show/hide toggle; the text is hidden by default. */
  password?: boolean;
  className?: string;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

/** A labelled input with an error line. Works with react-hook-form through <Controller>. */
export const TextField = ({ label, error, hint, password, className, editable = true, ref, ...props }: TextFieldProps) => {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);
  return (
    <View className={cn("gap-1.5", className)}>
      <AppText variant="label">{label}</AppText>
      <View
        className={cn(
          "min-h-12 flex-row items-center rounded-lg border bg-white px-3 dark:bg-slate-900",
          error ? "border-red-500" : "border-slate-300 dark:border-slate-700",
          !editable && "opacity-60",
        )}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.subtle}
          editable={editable}
          secureTextEntry={password ? hidden : props.secureTextEntry}
          autoCapitalize={password ? "none" : props.autoCapitalize}
          autoCorrect={password ? false : props.autoCorrect}
          className="flex-1 py-3 text-base text-slate-900 dark:text-slate-100"
          {...props}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={10}
            onPress={() => setHidden((h) => !h)}
            className="pl-2"
          >
            {hidden ? <Eye size={20} color={colors.muted} /> : <EyeOff size={20} color={colors.muted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" className="text-red-600 dark:text-red-400" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
};
