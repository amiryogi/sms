import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { router, Stack } from "expo-router";
import { Megaphone } from "lucide-react-native";
import { AppText, Badge, Card, EmptyState, ErrorState, OfflineBanner, PressableCard, QueryView, Screen, SkeletonList, TextField } from "@/components/ui";
import { useNotice, useNotices } from "@/features/portal/hooks";
import { PRIORITY } from "@/features/portal/labels";
import type { Notice } from "@/types/api";
import { formatDate, formatDateTime, fullName } from "@/utils/format";

/** Notices the signed-in user may see (role, class and date window are decided by the server). */
export const NoticesView = () => {
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(text.trim()), 400);
    return () => clearTimeout(t);
  }, [text]);

  const query = useNotices(search);
  const rows = query.data?.pages.flatMap((p) => p.rows) ?? [];

  return (
    <View className="flex-1 bg-canvas">
      <Stack.Screen options={{ title: "Notices" }} />
      <OfflineBanner />
      <View className="px-4 pt-4">
        <TextField label="Search notices" value={text} onChangeText={setText} placeholder="Title or text" returnKeyType="search" />
      </View>
      {query.data === undefined ? (
        <View className="p-4">{query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : <SkeletonList />}</View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(n) => String(n.id)}
          contentContainerClassName="gap-3 p-4 pb-10"
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => query.refetch()}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
          }}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="py-4" /> : undefined}
          ListEmptyComponent={<EmptyState icon={Megaphone} title={search ? "No notices match" : "No notices"} />}
          renderItem={({ item }) => <NoticeCard notice={item} />}
        />
      )}
    </View>
  );
};

const NoticeCard = ({ notice: n }: { notice: Notice }) => (
  <PressableCard className="gap-1.5" onPress={() => router.push(`/shared/notice/${n.id}`)}>
    <View className="flex-row items-start justify-between gap-2">
      <AppText className="flex-1 font-semibold" numberOfLines={2}>
        {n.title}
      </AppText>
      {n.priority === "high" || n.priority === "urgent" ? <Badge label={PRIORITY[n.priority].label} tone={PRIORITY[n.priority].tone} /> : null}
    </View>
    <AppText variant="muted" numberOfLines={2}>
      {n.content}
    </AppText>
    <AppText variant="caption">{formatDate(n.publishedAt ?? n.createdAt)}</AppText>
  </PressableCard>
);

export const NoticeDetail = ({ id }: { id: number }) => {
  const query = useNotice(id);
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: "Notice" }} />
      <QueryView query={query}>
        {(n) => (
          <>
            {n.priority === "high" || n.priority === "urgent" ? <Badge label={PRIORITY[n.priority].label} tone={PRIORITY[n.priority].tone} /> : null}
            <AppText variant="title" className="mt-2" accessibilityRole="header">
              {n.title}
            </AppText>
            <AppText variant="caption" className="mt-1">
              {formatDateTime(n.publishedAt ?? n.createdAt)}
              {n.createdBy ? ` · ${fullName(n.createdBy)}` : ""}
            </AppText>
            <Card className="mt-4">
              <AppText selectable className="leading-6">
                {n.content}
              </AppText>
            </Card>
            {n.publishTo ? <AppText variant="caption" className="mt-3">Shown until {formatDate(n.publishTo)}</AppText> : null}
          </>
        )}
      </QueryView>
    </Screen>
  );
};
