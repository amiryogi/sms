import type { ComponentRef, Ref } from "react";
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps, type TextStyle } from "react-native";
import { cssInterop } from "nativewind";

/**
 * Text and TextInput in the app's typeface (Mukta, loaded in src/app/_layout.tsx).
 *
 * React Native has no global default font, and a custom font needs one file
 * per weight: these read the weight NativeWind resolved from the className
 * (font-semibold, font-bold…) and pick the matching Mukta file. Use them
 * instead of react-native's Text / TextInput everywhere.
 */
const FAMILY: Record<string, string> = {
  "100": "Mukta_300Light",
  "200": "Mukta_300Light",
  "300": "Mukta_300Light",
  "400": "Mukta_400Regular",
  normal: "Mukta_400Regular",
  "500": "Mukta_500Medium",
  "600": "Mukta_600SemiBold",
  "700": "Mukta_700Bold",
  bold: "Mukta_700Bold",
  "800": "Mukta_800ExtraBold",
  "900": "Mukta_800ExtraBold",
};

export const familyFor = (weight: TextStyle["fontWeight"] | undefined) => FAMILY[String(weight ?? "400")] ?? FAMILY["400"]!;

const withFamily = (style: TextProps["style"]) => {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  // An explicit family wins; otherwise the weight picks the file and the
  // weight itself is cleared (Android would fake-bold an already bold file).
  return [style, { fontFamily: flat.fontFamily ?? familyFor(flat.fontWeight), fontWeight: "normal" as const }];
};

const AppTextBase = ({ style, ...props }: TextProps) => <RNText {...props} style={withFamily(style)} />;

/**
 * A text input whose digits are never clipped: no line height (on Android a
 * line height plus the default padding cuts the glyphs off, which hid marks),
 * vertical padding instead of a fixed height, and font padding kept for
 * Mukta's tall Devanagari-ready metrics.
 */
const AppTextInputBase = ({ style, ref, ...props }: TextInputProps & { ref?: Ref<ComponentRef<typeof RNTextInput>> }) => {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  return (
    <RNTextInput
      ref={ref}
      {...props}
      style={[style, { fontFamily: flat.fontFamily ?? familyFor(flat.fontWeight), fontWeight: "normal", lineHeight: undefined, textAlignVertical: props.multiline ? "top" : "center" }]}
    />
  );
};

cssInterop(AppTextBase, { className: "style" });
cssInterop(AppTextInputBase, { className: "style" });

export const Text = AppTextBase;
export const TextInput = AppTextInputBase;
