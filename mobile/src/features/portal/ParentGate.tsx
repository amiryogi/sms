import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Users } from "lucide-react-native";
import { Avatar, Chip, EmptyState, ErrorState, Screen, SkeletonList, Text } from "@/components/ui";
import { useTheme } from "@/theme/ThemeProvider";
import type { Child } from "@/types/api";
import { resolveAssetUrl } from "@/utils/assets";
import { useChild } from "./ChildContext";

/**
 * The children as chips, shown when a parent has more than one.
 * "bar" sits above a screen; "hero" sits inside the home screen's brand header.
 */
export const ChildSwitcher = ({ variant = "bar" }: { variant?: "bar" | "hero" }) => {
  const { children, child, selectChild } = useChild();
  const { onBrand } = useTheme();
  if (children.length < 2) return null;

  if (variant === "hero") {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" accessibilityLabel="Choose a child">
        {children.map((c) => {
          const selected = c.studentId === child?.studentId;
          return (
            <Pressable
              key={c.studentId}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={c.fullName}
              onPress={() => selectChild(c.studentId)}
              style={selected ? { backgroundColor: onBrand } : { borderColor: onBrand, borderWidth: 1.5, opacity: 0.9 }}
              className="min-h-11 flex-row items-center gap-2 rounded-full py-1 pl-1 pr-4"
            >
              <ChildAvatar child={c} size={34} />
              {/* Filled with the on-brand colour, the selected chip takes the brand fill as text: the same contrast as the hero text. */}
              <SelectedName name={c.firstName} selected={selected} />
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 py-3"
      accessibilityLabel="Choose a child"
      className="flex-grow-0 border-b border-line bg-surface"
    >
      {children.map((c) => (
        <Chip key={c.studentId} label={c.firstName} selected={c.studentId === child?.studentId} onPress={() => selectChild(c.studentId)} />
      ))}
    </ScrollView>
  );
};

const SelectedName = ({ name, selected }: { name: string; selected: boolean }) => {
  const { onBrand, brand } = useTheme();
  return (
    <Text style={{ color: selected ? brand[600] : onBrand }} className="text-sm font-bold">
      {name}
    </Text>
  );
};

/** A child's small avatar, for headers. */
export const ChildAvatar = ({ child, size = 40 }: { child: Child; size?: number }) => (
  <Avatar name={child.fullName} uri={resolveAssetUrl(child.user?.avatarUrl ?? child.avatarUrl)} size={size} />
);

/**
 * Wraps every parent screen: loads the linked children, shows the switcher and
 * renders the screen for the chosen child. Keyed by the child's id, so nothing
 * of one child's screen state carries over to another. Home passes
 * `switcher={false}` and draws the switcher inside its header instead.
 */
export const ParentGate = ({
  children: render,
  scroll = true,
  switcher = true,
}: {
  children: (child: Child) => ReactNode;
  scroll?: boolean;
  switcher?: boolean;
}) => {
  const { child, isLoading, error, refetch, children } = useChild();
  if (!child) {
    return (
      <Screen>
        {isLoading ? (
          <SkeletonList />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : children.length === 0 ? (
          <EmptyState icon={Users} title="No children linked yet" message="Ask the school office to link your child to your account." />
        ) : null}
      </Screen>
    );
  }
  return (
    <View className="flex-1 bg-canvas" key={child.studentId}>
      {switcher ? <ChildSwitcher /> : null}
      {scroll ? <View className="flex-1">{render(child)}</View> : render(child)}
    </View>
  );
};
