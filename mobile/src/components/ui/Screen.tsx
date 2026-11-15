import type { ReactNode } from "react";
import { KeyboardAvoidingView, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "./cn";
import { OfflineBanner } from "./states";

/**
 * The frame of every screen: safe areas, the offline banner, and (when
 * `onRefresh` is given) pull to refresh. Screens with long lists pass
 * `scroll={false}` and render their own FlatList inside. `bleed` removes the
 * content padding so a hero (HomeHeader) can run edge to edge.
 *
 * The body moves up for the keyboard on both platforms. Android used to resize
 * the window by itself; with the edge-to-edge layout it no longer does, and the
 * keyboard covered the field being typed in.
 */
export const Screen = ({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  header,
  footer,
  edges = ["left", "right"],
  className,
  contentClassName,
}: {
  children: ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  edges?: Edge[];
  className?: string;
  contentClassName?: string;
}) => {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={edges} className={cn("flex-1 bg-canvas", className)}>
      <OfflineBanner />
      {header}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName={cn("px-4 pb-12 pt-4", contentClassName)}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brandFill]} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View className={cn("flex-1", contentClassName)}>{children}</View>
        )}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
