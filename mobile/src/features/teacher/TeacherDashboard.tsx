import { useMemo } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQueries } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, ClipboardList, Megaphone, PenLine, Users } from "lucide-react-native";
import { attendanceService } from "@/api/services/attendance";
import { AppText, Badge, Card, Divider, ListItem, QueryView, Screen, SectionHeader, StatCard } from "@/components/ui";
import { HomeHeader } from "@/features/dashboard/HomeHeader";
import { useNotices } from "@/features/portal/hooks";
import { formatDate } from "@/utils/format";
import { kathmanduToday } from "@/utils/nepaliDate";
import { teacherKeys, useMarksExams, useMyStudents, useOwnAssignments, useTeacherAssignments } from "./hooks";
import { sectionLabel, sectionsFrom } from "./sections";

/**
 * A teacher's day: their sections with today's attendance status, exams open
 * for marks, recent assignments and notices. Today's status is read per
 * section from GET /attendance (there is no summary endpoint: API_GAPS #3).
 */
export const TeacherDashboard = () => {
  const assignments = useTeacherAssignments();
  const students = useMyStudents();
  const exams = useMarksExams();
  const own = useOwnAssignments();
  const notices = useNotices();
  const sections = useMemo(() => sectionsFrom(assignments.data ?? []), [assignments.data]);
  const today = kathmanduToday();

  const days = useQueries({
    queries: sections.map((s) => ({
      queryKey: teacherKeys.sectionDay(s.classId, s.sectionId, today),
      queryFn: ({ signal }: { signal: AbortSignal }) => attendanceService.forSection({ classId: s.classId, sectionId: s.sectionId, date: today }, signal),
    })),
  });

  const marksOpen = (exams.data ?? []).reduce((n, e) => n + e.examSubjects.reduce((m, es) => m + es.assignedSectionIds.length, 0), 0);
  const summary = students.data && !Array.isArray(students.data) ? students.data.summary : null;

  const refresh = () => {
    assignments.refetch();
    students.refetch();
    exams.refetch();
    own.refetch();
    notices.refetch();
    days.forEach((d) => d.refetch());
  };

  return (
    <Screen onRefresh={refresh} refreshing={assignments.isRefetching}>
      <HomeHeader />
      <View className="flex-row gap-3">
        <StatCard icon={Users} label="Students" value={summary ? String(summary.totalStudents) : "—"} hint={summary ? `${summary.totalSections} section(s)` : null} />
        <StatCard icon={PenLine} label="Marks to enter" value={exams.data ? String(marksOpen) : "—"} hint="subject-sections open" tone="warning" />
      </View>

      <SectionHeader title="Today's attendance" />
      <QueryView query={assignments} isEmpty={() => sections.length === 0} empty={<AppText variant="muted">No classes this year.</AppText>}>
        {() => (
          <Card className="p-0">
            {sections.map((s, i) => {
              const day = days[i]?.data;
              const marked = day ? day.filter((r) => r.status).length : null;
              const done = day && marked === day.length && day.length > 0;
              return (
                <View key={s.key}>
                  {i > 0 ? <Divider className="ml-16" /> : null}
                  <ListItem
                    icon={done ? CheckCircle2 : CircleDashed}
                    title={sectionLabel(s)}
                    subtitle={s.subjects.map((x) => x.subjectName).join(", ")}
                    right={
                      day ? (
                        <Badge label={done ? "Marked" : marked ? `${marked}/${day.length}` : "Not marked"} tone={done ? "success" : marked ? "warning" : "neutral"} />
                      ) : null
                    }
                    onPress={() => router.push("/teacher/attendance")}
                  />
                </View>
              );
            })}
          </Card>
        )}
      </QueryView>

      <SectionHeader title="Recent assignments" />
      <Card className="p-0">
        {(own.data ?? []).slice(0, 3).map((a, i) => (
          <View key={a.id}>
            {i > 0 ? <Divider className="ml-16" /> : null}
            <ListItem
              icon={ClipboardList}
              title={a.title}
              subtitle={`${a.teacherSubject.classSubject.class.name} ${a.teacherSubject.section.name} · ${a._count?.submissions ?? 0} handed in`}
              onPress={() => router.push(`/teacher/assignments/${a.id}`)}
            />
          </View>
        ))}
        {own.data && own.data.length === 0 ? (
          <AppText variant="muted" className="p-4">
            No assignments yet.
          </AppText>
        ) : null}
      </Card>

      <SectionHeader title="Notices" />
      <Card className="p-0">
        {(notices.data?.pages[0]?.rows ?? []).slice(0, 3).map((n, i) => (
          <View key={n.id}>
            {i > 0 ? <Divider className="ml-16" /> : null}
            <ListItem icon={Megaphone} title={n.title} subtitle={formatDate(n.publishedAt ?? n.createdAt)} onPress={() => router.push(`/shared/notice/${n.id}`)} />
          </View>
        ))}
        {notices.data && !notices.data.pages[0]?.rows.length ? (
          <AppText variant="muted" className="p-4">
            No notices right now.
          </AppText>
        ) : null}
      </Card>
    </Screen>
  );
};
