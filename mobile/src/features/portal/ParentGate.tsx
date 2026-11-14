import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { Users } from "lucide-react-native";
import { Avatar, Chip, EmptyState, ErrorState, Screen, SkeletonList } from "@/components/ui";
import type { Child } from "@/types/api";
import { resolveAssetUrl } from "@/utils/assets";
import { useChild } from "./ChildContext";

/** The children as chips, shown when a parent has more than one. */
export const ChildSwitcher = () => {
  const { children, child, selectChild } = useChild();
  if (children.length < 2) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 py-3"
      accessibilityLabel="Choose a child"
      className="flex-grow-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      {children.map((c) => (
        <Chip key={c.studentId} label={c.firstName} selected={c.studentId === child?.studentId} onPress={() => selectChild(c.studentId)} />
      ))}
    </ScrollView>
  );
};

/** A child's small avatar, for headers. */
export const ChildAvatar = ({ child, size = 40 }: { child: Child; size?: number }) => (
  <Avatar name={child.fullName} uri={resolveAssetUrl(child.user?.avatarUrl ?? child.avatarUrl)} size={size} />
);

/**
 * Wraps every parent screen: loads the linked children, shows the switcher and
 * renders the screen for the chosen child. Keyed by the child's id, so nothing
 * of one child's screen state carries over to another.
 */
export const ParentGate = ({ children: render, scroll = true }: { children: (child: Child) => ReactNode; scroll?: boolean }) => {
  const { child, isLoading, error, refetch, children } = useChild();
  if (!child) {
    return (
      <Screen>
        {isLoading ? (
          <SkeletonList />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : children.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No children linked yet"
            message="Ask the school office to link your child to your account."
          />
        ) : null}
      </Screen>
    );
  }
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950" key={child.studentId}>
      <ChildSwitcher />
      {scroll ? <View className="flex-1">{render(child)}</View> : render(child)}
    </View>
  );
};
