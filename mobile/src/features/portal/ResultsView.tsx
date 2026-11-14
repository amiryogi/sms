import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Award, CheckCircle2, FileText, XCircle } from "lucide-react-native";
import { AppText, Badge, Button, Card, Chip, cn, EmptyState, QueryView, Screen, SectionHeader, SkeletonList, StatCard } from "@/components/ui";
import type { ReportCard, SubjectResult } from "@/types/api";
import { useTheme } from "@/theme/ThemeProvider";
import { formatPercent } from "@/utils/format";
import { usePublishedExams, useReportCard } from "./hooks";

const num = (v: number | null | undefined) => (v === null || v === undefined ? "—" : String(Number(v)));
const fixed = (v: number | null | undefined, d: number) => (typeof v === "number" ? v.toFixed(d) : "—");

/**
 * Results from the student's PUBLISHED report cards only (CLAUDE.md §4.7).
 * Grades, GPA and pass/fail come from the server on the school's own scale
 * (§4.8); nothing is recalculated here.
 */
export const ResultsView = ({ studentId }: { studentId: number }) => {
  const exams = usePublishedExams(studentId);
  const [examId, setExamId] = useState<number | null>(null);
  const selected = examId ?? exams.data?.[0]?.examId ?? null;
  const card = useReportCard(studentId, selected);

  return (
    <Screen
      onRefresh={() => {
        exams.refetch();
        card.refetch();
      }}
      refreshing={exams.isRefetching || card.isRefetching}
    >
      <QueryView
        query={exams}
        isEmpty={(list) => list.length === 0}
        empty={<EmptyState icon={Award} title="No results yet" message="Results appear here once the school publishes the report cards." />}
      >
        {(list) => (
          <>
            {list.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-3">
                {list.map((e) => (
                  <Chip key={e.examId} label={e.examName} selected={e.examId === selected} onPress={() => setExamId(e.examId)} />
                ))}
              </ScrollView>
            ) : null}
            <QueryView query={card} loading={<SkeletonList rows={3} />}>
              {(data) => <Result card={data} studentId={studentId} examId={selected!} />}
            </QueryView>
          </>
        )}
      </QueryView>
    </Screen>
  );
};

const Result = ({ card, studentId, examId }: { card: ReportCard; studentId: number; examId: number }) => {
  const s = card.summary;
  return (
    <>
      <Card className="gap-1">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <AppText variant="heading">{card.examination.name}</AppText>
            <AppText variant="muted">
              {card.student.class} {card.student.section} · {card.examination.academicYear}
            </AppText>
          </View>
          {s.isPassed ? <Badge label="Passed" tone="success" /> : <Badge label="Not passed" tone="danger" />}
        </View>
        <AppText variant="caption">Graded on {card.meta.gradeScale}</AppText>
      </Card>

      <View className="mt-3 flex-row gap-3">
        <StatCard label="GPA" value={fixed(s.gpa, 2)} hint={`Grade ${s.grade ?? "—"}`} tone="brand" />
        <StatCard label="Percentage" value={formatPercent(s.percentage)} hint={`${num(s.totalMarks)} / ${num(s.totalFullMarks)}`} tone="success" />
      </View>
      <View className="mt-3 flex-row gap-3">
        <StatCard label="Class rank" value={s.classRank ? String(s.classRank) : "—"} tone="neutral" />
        <StatCard
          label="Subjects passed"
          value={`${s.passedSubjects} / ${s.totalSubjects}`}
          hint={s.failedSubjects ? `${s.failedSubjects} not passed` : null}
          tone={s.failedSubjects ? "warning" : "neutral"}
        />
      </View>

      <Button
        title="Open report card"
        icon={FileText}
        variant="secondary"
        className="mt-4"
        onPress={() => router.push(`/shared/report-card/${studentId}/${examId}`)}
      />

      <SectionHeader title="Subjects" />
      <View className="gap-2">
        {card.subjects.map((sub) => (
          <SubjectRow key={sub.subjectId} sub={sub} />
        ))}
      </View>

      {card.remarks.teacher || card.remarks.principal ? (
        <>
          <SectionHeader title="Remarks" />
          <Card className="gap-3">
            {card.remarks.teacher ? (
              <View>
                <AppText variant="caption">Class teacher</AppText>
                <AppText>{card.remarks.teacher}</AppText>
              </View>
            ) : null}
            {card.remarks.principal ? (
              <View>
                <AppText variant="caption">Principal</AppText>
                <AppText>{card.remarks.principal}</AppText>
              </View>
            ) : null}
          </Card>
        </>
      ) : null}
    </>
  );
};

/** One subject: theory and practical (when it has one), total, grade and GP. */
export const SubjectRow = ({ sub }: { sub: SubjectResult }) => {
  const { colors } = useTheme();
  return (
  <Card
    className={cn("gap-2", !sub.isPassed && "border-red-200 dark:border-red-900")}
    accessible
    accessibilityLabel={`${sub.subjectName}: grade ${sub.finalGrade ?? "none"}${sub.isPassed ? "" : ", not passed"}`}
  >
    <View className="flex-row items-center justify-between gap-2">
      <View className="flex-1">
        <AppText className="font-semibold">{sub.subjectName}</AppText>
        {sub.subjectCode ? <AppText variant="caption">{sub.subjectCode}</AppText> : null}
      </View>
      <View className="items-end">
        <View className="flex-row items-center gap-1">
          {sub.isPassed ? <CheckCircle2 size={16} color={colors.success} /> : <XCircle size={16} color={colors.danger} />}
          <AppText variant="heading">{sub.isAbsent ? "AB" : (sub.finalGrade ?? "—")}</AppText>
        </View>
        <AppText variant="caption">GP {fixed(sub.finalGpa, 1)}</AppText>
      </View>
    </View>
    <View className="flex-row flex-wrap gap-x-5 gap-y-1">
      <AppText variant="muted">
        Theory: {sub.isAbsent ? "Absent" : `${num(sub.theoryMarks)} / ${num(sub.theoryFullMarks)}`}
        {sub.theoryGrade ? ` (${sub.theoryGrade})` : ""}
      </AppText>
      {sub.hasPractical ? (
        <AppText variant="muted">
          Practical: {num(sub.practicalMarks)} / {num(sub.practicalFullMarks)}
          {sub.practicalGrade ? ` (${sub.practicalGrade})` : ""}
        </AppText>
      ) : null}
      {!sub.isAbsent ? (
        <AppText variant="muted">
          Total: {num(sub.totalMarks)} / {num(sub.totalFullMarks)}
        </AppText>
      ) : null}
    </View>
    {sub.remark ? <AppText variant="caption">{sub.remark}</AppText> : null}
  </Card>
  );
};
