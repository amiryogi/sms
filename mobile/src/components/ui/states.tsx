import { useEffect, useState, type ReactNode } from "react";
import { Animated, View } from "react-native";
import { useNetworkState } from "expo-network";
import { AlertTriangle, CloudOff, Inbox, Lock, RefreshCw, type LucideIcon } from "lucide-react-native";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ApiFailure } from "@/api/errors";
import { useTheme } from "@/theme/ThemeProvider";
import { formatDateTime } from "@/utils/format";
import { cn } from "./cn";
import { AppText, Button } from "./primitives";

/* -------------------------------------------------------------- skeleton */

/** A grey placeholder that pulses while data loads (native-driver opacity loop). */
export const Skeleton = ({ className, height = 16, width }: { className?: string; height?: number; width?: number | `${number}%` }) => {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ opacity, height, width }}
      className={cn("rounded-md bg-slate-200 dark:bg-slate-800", className)}
    />
  );
};

/** A few skeleton cards, the default loading state of a screen. */
export const SkeletonList = ({ rows = 4 }: { rows?: number }) => (
  <View className="gap-3" accessibilityLabel="Loading" accessibilityRole="progressbar">
    {Array.from({ length: rows }, (_, i) => (
      <View key={i} className="gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <Skeleton width="60%" height={18} />
        <Skeleton width="40%" />
      </View>
    ))}
  </View>
);

/* ---------------------------------------------------------------- states */

export const EmptyState = ({
  title,
  message,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  message?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) => {
  const { colors } = useTheme();
  return (
    <View className="items-center gap-2 px-6 py-12">
      <Icon size={40} color={colors.subtle} />
      <AppText variant="heading" className="text-center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="muted" className="text-center">
          {message}
        </AppText>
      ) : null}
      {action}
    </View>
  );
};

/** What went wrong, in the user's terms, with a retry when retrying can help. */
export const ErrorState = ({ error, onRetry }: { error: ApiFailure | Error | null; onRetry?: () => void }) => {
  const failure = error as Partial<ApiFailure> | null;
  if (failure?.isForbidden) {
    return <EmptyState icon={Lock} title="You don't have access to this" message={failure.message} />;
  }
  if (failure?.isNotFound) {
    return <EmptyState title="Not found" message={failure.message} />;
  }
  const offline = failure?.isNetwork;
  return (
    <EmptyState
      icon={offline ? CloudOff : AlertTriangle}
      title={offline ? "You're offline" : "Couldn't load this"}
      message={error?.message}
      action={onRetry ? <Button title="Try again" icon={RefreshCw} variant="secondary" onPress={onRetry} className="mt-3" /> : undefined}
    />
  );
};

/** A thin bar while the device has no connection. */
export const OfflineBanner = () => {
  const state = useNetworkState();
  const { colors } = useTheme();
  if (state.isConnected !== false) return null;
  return (
    <View accessibilityRole="alert" className="flex-row items-center justify-center gap-2 bg-amber-100 px-4 py-2 dark:bg-amber-950">
      <CloudOff size={16} color={colors.warning} />
      <AppText variant="caption" className="font-medium text-amber-900 dark:text-amber-200">
        Offline: showing saved information
      </AppText>
    </View>
  );
};

/** "Updated 13 Nov 2026, 10:30" under data that may be old (cached or offline). */
export const StaleNote = ({ updatedAt, isStale }: { updatedAt: number; isStale?: boolean }) => {
  if (!updatedAt) return null;
  return (
    <AppText variant="caption" className={cn("px-1", isStale && "text-amber-700 dark:text-amber-400")}>
      {isStale ? "Saved copy, " : ""}updated {formatDateTime(updatedAt)}
    </AppText>
  );
};

/**
 * The standard states of a query: skeleton while loading, error with retry,
 * empty, or the content. Data already on screen stays when a refetch fails.
 */
export const QueryView = <T,>({
  query,
  children,
  isEmpty,
  empty,
  loading,
}: {
  query: UseQueryResult<T, ApiFailure>;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  loading?: ReactNode;
}) => {
  if (query.data === undefined) {
    if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
    // Offline with nothing saved yet: say so instead of loading forever.
    if (query.fetchStatus === "paused") {
      return <EmptyState icon={CloudOff} title="You're offline" message="This will load when you're back online." />;
    }
    return <>{loading ?? <SkeletonList />}</>;
  }
  if (isEmpty?.(query.data)) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return <>{children(query.data)}</>;
};
