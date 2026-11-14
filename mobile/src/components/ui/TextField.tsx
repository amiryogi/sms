import { useState, type ComponentRef, type Ref } from "react";
import { Pressable, View, type TextInput as RNTextInput, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "./cn";
import { AppText } from "./primitives";
import { TextInput } from "./Text";

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  /** Adds a show/hide toggle; the text is hidden by default. */
  password?: boolean;
  className?: string;
  ref?: Ref<ComponentRef<typeof RNTextInput>>;
};

/** A labelled input with an error line. Works with react-hook-form through <Controller>. */
export const TextField = ({ label, error, hint, password, className, editable = true, ref, multiline, ...props }: TextFieldProps) => {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  return (
    <View className={cn("gap-1.5", className)}>
      <AppText variant="label">{label}</AppText>
      <View
        className={cn(
          "flex-row items-center rounded-xl border-2 bg-surface px-3.5",
          multiline ? "min-h-28 py-1" : "min-h-14",
          error ? "border-bad" : focused ? "border-brand-600" : "border-line",
          !editable && "opacity-60",
        )}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.subtle}
          editable={editable}
          multiline={multiline}
          secureTextEntry={password ? hidden : props.secureTextEntry}
          autoCapitalize={password ? "none" : props.autoCapitalize}
          autoCorrect={password ? false : props.autoCorrect}
          className="flex-1 py-2.5 text-base text-ink"
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={10}
            onPress={() => setHidden((h) => !h)}
            className="h-11 w-11 items-center justify-center"
          >
            {hidden ? <Eye size={20} color={colors.muted} /> : <EyeOff size={20} color={colors.muted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" className="text-sm text-bad" accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
};
