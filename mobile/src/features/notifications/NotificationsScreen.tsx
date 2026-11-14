import { FlatList, Pressable, View } from "react-native";
import { router, Stack, type Href } from "expo-router";
import { Award, Bell, CheckCheck, ClipboardList, Megaphone, Star, Wallet, type LucideIcon } from "lucide-react-native";
import { AppText, Button, cn, EmptyState, OfflineBanner } from "@/components/ui";
import { useTheme } from "@/theme/ThemeProvider";
import { TOKENS } from "@/theme/tokens";
import { formatRelativeDay } from "@/utils/format";
import type { FeedItem } from "./feed";
import { useNotificationFeed } from "./useNotificationFeed";

const ICONS: Record<FeedItem["kind"], LucideIcon> = {
  notice: Megaphone,
  assignment: ClipboardList,
  graded: Star,
  result: Award,
  fees: Wallet,
};

/**
 * What is new for this user: notices, and for students and parents
 * assignments, grades, published report cards and overdue fees. Built from the
 * API's lists; read state is kept on this phone (no notification API yet).
 */
export const NotificationsScreen = () => {
  const feed = useNotificationFeed();
  const { colors } = useTheme();

  const open = (item: FeedItem) => {
    feed.markRead([item.id]);
    if (item.href) router.push(item.href as Href);
  };

  return (
    <View className="flex-1 bg-canvas">
      <Stack.Screen options={{ title: "Notifications" }} />
      <OfflineBanner />
      {feed.unreadCount ? (
        <View className="flex-row justify-end px-4 pt-3">
          <Button title="Mark all as read" icon={CheckCheck} size="sm" variant="ghost" onPress={feed.markAllRead} />
        </View>
      ) : null}
      <FlatList
        data={feed.items}
        keyExtractor={(i) => i.id}
        contentContainerClassName="gap-2 p-4 pb-10"
        refreshing={feed.isRefetching}
        onRefresh={feed.refetch}
        ListEmptyComponent={
          feed.isLoading ? undefined : <EmptyState icon={Bell} title="Nothing new" message="Notices, results and homework appear here." />
        }
        renderItem={({ item }) => {
          const Icon = ICONS[item.kind];
          const unread = feed.unreadIds.has(item.id);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${unread ? "Unread. " : ""}${item.title}. ${item.body}`}
              onPress={() => open(item)}
              className={cn(
                "flex-row gap-3 rounded-xl border p-3",
                unread ? "border-brand-ink/30 bg-brand-soft" : "border-line bg-surface",
              )}
            >
              <Icon size={20} color={colors.brand} />
              <View className="flex-1 gap-0.5">
                <AppText className={cn("text-sm", unread && "font-semibold")}>{item.title}</AppText>
                <AppText variant="muted" numberOfLines={2}>
                  {item.body}
                </AppText>
                {item.kind !== "fees" ? <AppText variant="caption">{formatRelativeDay(item.date)}</AppText> : null}
              </View>
              {unread ? <View className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-600" accessibilityElementsHidden /> : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
};

/** The bell in each area's header, with the unread count. */
export const NotificationBell = ({ color }: { color?: string }) => {
  const { unreadCount } = useNotificationFeed();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
      hitSlop={8}
      onPress={() => router.push("/shared/notifications")}
      className="mr-1 h-11 w-11 items-center justify-center rounded-full active:bg-sunken"
    >
      <Bell size={22} color={color ?? colors.ink} strokeWidth={2} />
      {unreadCount ? (
        // Marigold with dark text: readable on any school colour and in both themes
        // (the light theme's ink, since the marigold is the same in both).
        <View className="absolute right-0.5 top-0.5 min-w-5 items-center rounded-full bg-warn-solid px-1">
          <AppText style={{ color: TOKENS.light.ink }} className="text-xs font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
};
