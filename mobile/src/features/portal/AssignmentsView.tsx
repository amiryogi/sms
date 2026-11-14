import { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { router } from "expo-router";
import { ClipboardList } from "lucide-react-native";
import { AppText, Badge, EmptyState, OfflineBanner, PressableCard, QueryView, SegmentedControl, SkeletonList } from "@/components/ui";
import type { Assignment } from "@/types/api";
import { formatDate, formatRelativeDay } from "@/utils/format";
import { kathmanduToday } from "@/utils/nepaliDate";
import { useAssignments } from "./hooks";
import { SUBMISSION_LABEL } from "./labels";

type Filter = "due" | "done" | "all";

const isPastDue = (a: Assignment) => !!a.dueDate && a.dueDate.slice(0, 10) < kathmanduToday();

/**
 * Published assignments for the student's class (the server decides which).
 * Students open one to hand it in; parents see the child's status read-only.
 */
export const AssignmentsView = ({ studentId, mode }: { studentId: number; mode: "student" | "parent" }) => {
  const query = useAssignments(studentId, mode);
  const [filter, setFilter] = useState<Filter>("due");

  const rows = useMemo(() => {
    const list = query.data ?? [];
    const submitted = (a: Assignment) => (a.submissions?.length ?? 0) > 0;
    if (filter === "due") return list.filter((a) => !submitted(a)).sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"));
    if (filter === "done") return list.filter(submitted);
    return list;
  }, [query.data, filter]);

  return (
    <View className="flex-1 bg-canvas">
      <OfflineBanner />
      <View className="px-4 pt-4">
        <SegmentedControl<Filter>
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "due", label: "To do" },
            { value: "done", label: "Handed in" },
            { value: "all", label: "All" },
          ]}
        />
      </View>
      <QueryView query={query} loading={<View className="p-4"><SkeletonList /></View>}>
        {() => (
          <FlatList
            data={rows}
            keyExtractor={(a) => String(a.id)}
            contentContainerClassName="gap-3 p-4 pb-10"
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            ListEmptyComponent={
              <EmptyState
                icon={ClipboardList}
                title={filter === "due" ? "Nothing to do" : "No assignments here"}
                message={filter === "due" ? "Everything has been handed in." : undefined}
              />
            }
            renderItem={({ item }) => <AssignmentCard a={item} studentId={studentId} />}
          />
        )}
      </QueryView>
    </View>
  );
};

const AssignmentCard = ({ a, studentId }: { a: Assignment; studentId: number }) => {
  const sub = a.submissions?.[0];
  const status = sub ? (SUBMISSION_LABEL[sub.status] ?? { label: sub.status, tone: "neutral" as const }) : null;
  const overdue = !sub && isPastDue(a);
  return (
    <PressableCard className="gap-1.5" onPress={() => router.push(`/shared/assignment/${a.id}?studentId=${studentId}`)}>
      <View className="flex-row items-start justify-between gap-2">
        <AppText className="flex-1 font-semibold" numberOfLines={2}>
          {a.title}
        </AppText>
        {status ? <Badge label={status.label} tone={status.tone} /> : overdue ? <Badge label="Past due" tone="danger" /> : null}
      </View>
      <AppText variant="muted">{a.teacherSubject.classSubject.subject.name}</AppText>
      <AppText variant="caption">
        {a.dueDate ? `Due ${formatDate(a.dueDate, "bs")} (${formatRelativeDay(a.dueDate)})` : "No due date"}
        {a.totalMarks ? ` · ${a.totalMarks} marks` : ""}
      </AppText>
      {sub?.marksObtained !== null && sub?.marksObtained !== undefined ? (
        <AppText variant="label">
          Marks: {Number(sub.marksObtained)}
          {a.totalMarks ? ` / ${a.totalMarks}` : ""}
        </AppText>
      ) : null}
    </PressableCard>
  );
};
