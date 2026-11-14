import { useCallback } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { assignmentService } from "@/api/services/assignments";
import { portalService } from "@/api/services/portal";
import { reportCardService } from "@/api/services/reportCards";
import { useUser } from "@/contexts/AuthContext";
import { portalKeys, useNotices } from "@/features/portal/hooks";
import { readJson, seenKey, writeJson } from "@/lib/storage";
import { hasRole } from "@/utils/roles";
import { childItems, isUnread, markSeen, mergeFeed, noticeItems, type FeedItem, type SeenState } from "./feed";

/**
 * The signed-in user's notification feed and unread count. Uses the same query
 * keys as the screens, so it mostly reads data that is already cached.
 * Students: their own items. Parents: every linked child. Staff: notices.
 */
export const useNotificationFeed = () => {
  const user = useUser();
  const qc = useQueryClient();
  const isStudent = hasRole(user.roles, "STUDENT");
  const isParent = hasRole(user.roles, "PARENT");
  const notices = useNotices();

  const children = useQuery({
    queryKey: portalKeys.children,
    queryFn: ({ signal }) => portalService.myChildren(signal),
    enabled: isParent,
    meta: { persist: true },
  });

  // Students: themselves. Parents: each child, by name. (The React Compiler memoizes.)
  const ownId = user.student?.id;
  const kids = children.data ?? [];
  const people: { studentId: number; name: string | undefined; own: boolean }[] =
    isStudent && ownId
      ? [{ studentId: ownId, name: undefined, own: true }]
      : isParent
        ? kids.map((c) => ({ studentId: c.studentId, name: kids.length > 1 ? c.firstName : undefined, own: false }))
        : [];

  const assignments = useQueries({
    queries: people.map((p) => ({
      queryKey: portalKeys.assignments(p.own ? "own" : p.studentId),
      queryFn: ({ signal }: { signal: AbortSignal }) => assignmentService.list(p.own ? {} : { studentId: p.studentId }, signal),
      meta: { persist: true },
    })),
  });
  const exams = useQueries({
    queries: people.map((p) => ({
      queryKey: portalKeys.publishedExams(p.studentId),
      queryFn: ({ signal }: { signal: AbortSignal }) => reportCardService.publishedExams(p.studentId, signal),
      meta: { persist: true },
    })),
  });
  const overviews = useQueries({
    queries: people.map((p) => ({
      queryKey: portalKeys.overview(p.studentId),
      queryFn: ({ signal }: { signal: AbortSignal }) => portalService.overview(p.studentId, signal),
      meta: { persist: true },
    })),
  });

  const key = seenKey(user.id);
  const seen = useQuery({
    queryKey: ["seen", key],
    networkMode: "always",
    staleTime: Infinity,
    queryFn: async () => {
      const stored = await readJson<SeenState | null>(key, null);
      if (stored) return stored;
      // First use on this phone: everything already there counts as seen.
      const first: SeenState = { since: new Date().toISOString(), ids: [] };
      await writeJson(key, first);
      return first;
    },
  });

  const items: FeedItem[] = mergeFeed(
        noticeItems(notices.data?.pages[0]?.rows ?? []),
        ...people.map((p, i) =>
          childItems({
            studentId: p.studentId,
            name: p.name,
            assignments: assignments[i]?.data,
            publishedExams: exams[i]?.data,
            overview: overviews[i]?.data,
            feesHref: p.own ? "/student/fees" : "/parent/fees",
          }),
        ),
  );

  const unread = items.filter((i) => isUnread(i, seen.data ?? null));

  const markRead = useCallback(
    (ids: string[]) => {
      const current = qc.getQueryData<SeenState>(["seen", key]);
      if (!current) return;
      const next = markSeen(current, ids);
      qc.setQueryData(["seen", key], next);
      writeJson(key, next);
    },
    [qc, key],
  );

  const refetch = () => {
    notices.refetch();
    [...assignments, ...exams, ...overviews].forEach((q) => q.refetch());
  };

  return {
    items,
    unreadIds: new Set(unread.map((i) => i.id)),
    unreadCount: unread.length,
    markRead,
    markAllRead: () => markRead(items.map((i) => i.id)),
    isLoading: notices.isLoading,
    isRefetching: notices.isRefetching,
    refetch,
  };
};
