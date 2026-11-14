import { useMemo } from "react";
import { SectionList, View } from "react-native";
import { router } from "expo-router";
import { PenLine } from "lucide-react-native";
import { AppText, EmptyState, OfflineBanner, PressableCard, QueryView, SkeletonList } from "@/components/ui";
import type { MarksEntryExam } from "@/types/teacher";
import { formatDate } from "@/utils/format";
import { useMarksExams, useTeacherAssignments } from "./hooks";

type Item = { key: string; examSubjectId: number; sectionId: number; subject: string; classSection: string; examDate: string | null };

/**
 * What the signed-in user may enter marks for: PUBLISHED exams only (the API
 * returns no others). Teachers get their own subjects and sections; exam
 * officers and admins every subject, with the sections that have students.
 */
export const MarksHome = ({ mode }: { mode: "teacher" | "officer" }) => {
  const exams = useMarksExams();
  // Teachers' section names come from their own assignments.
  const own = useTeacherAssignments();
  const sectionName = useMemo(() => new Map((own.data ?? []).map((a) => [a.sectionId, a.section.name])), [own.data]);

  const groups = useMemo(() => (exams.data ?? []).map((exam) => ({ exam, data: itemsOf(exam, mode, sectionName) })), [exams.data, mode, sectionName]);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <OfflineBanner />
      <QueryView
        query={exams}
        loading={<View className="p-4"><SkeletonList /></View>}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={PenLine}
            title="No exam open for marks"
            message="Marks can be entered while an exam is published. The exam office publishes and locks exams."
          />
        }
      >
        {() => (
          <SectionList
            sections={groups}
            keyExtractor={(i) => i.key}
            contentContainerClassName="gap-2 p-4 pb-10"
            refreshing={exams.isRefetching}
            onRefresh={() => exams.refetch()}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <View className="mb-1 mt-3">
                <AppText variant="heading">{section.exam.name}</AppText>
                <AppText variant="caption">
                  {section.exam.academicYear?.name ?? ""}
                  {section.exam.startDate ? ` · from ${formatDate(section.exam.startDate, "bs")}` : ""}
                </AppText>
              </View>
            )}
            renderItem={({ item, section }) => (
              <PressableCard
                className="flex-row items-center justify-between"
                onPress={() =>
                  router.push({
                    pathname: "/shared/marks/[examSubjectId]/[sectionId]",
                    params: { examSubjectId: String(item.examSubjectId), sectionId: String(item.sectionId), title: `${item.subject} · ${item.classSection}`, exam: section.exam.name },
                  })
                }
              >
                <View className="flex-1">
                  <AppText className="font-semibold">{item.subject}</AppText>
                  <AppText variant="muted">{item.classSection}</AppText>
                </View>
                {item.examDate ? <AppText variant="caption">{formatDate(item.examDate, "bs")}</AppText> : null}
              </PressableCard>
            )}
          />
        )}
      </QueryView>
    </View>
  );
};

const itemsOf = (exam: MarksEntryExam, mode: "teacher" | "officer", sectionName: Map<number, string>): Item[] =>
  exam.examSubjects
    .flatMap((es) => {
      const sections =
        mode === "officer" && es.sections?.length
          ? es.sections
          : es.assignedSectionIds.map((id) => ({ id, name: sectionName.get(id) ?? `Section ${id}` }));
      return sections.map((s) => ({
        key: `${es.id}:${s.id}`,
        examSubjectId: es.id,
        sectionId: s.id,
        subject: es.classSubject.subject.name,
        classSection: `${es.classSubject.class.name} ${s.name}`,
        examDate: es.examDate,
      }));
    })
    .sort((a, b) => a.classSection.localeCompare(b.classSection) || a.subject.localeCompare(b.subject));
