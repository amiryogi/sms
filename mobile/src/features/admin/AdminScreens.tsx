import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Linking, ScrollView, View } from "react-native";
import { router, Stack, type Href } from "expo-router";
import { BookOpen, CalendarRange, GraduationCap, Megaphone, School, Users } from "lucide-react-native";
import { studentService } from "@/api/services/students";
import { userService, type StaffRole } from "@/api/services/users";
import {
  AppText,
  Avatar,
  Badge,
  Card,
  Chip,
  Divider,
  EmptyState,
  ErrorState,
  ListItem,
  OfflineBanner,
  PressableCard,
  QueryView,
  Screen,
  SectionHeader,
  SkeletonList,
  StatCard,
  TextField,
  type Tone,
} from "@/components/ui";
import { HomeHeader } from "@/features/dashboard/HomeHeader";
import { useNotices } from "@/features/portal/hooks";
import type { ExamStatus } from "@/types/api";
import type { ExamRow } from "@/types/admin";
import { resolveAssetUrl } from "@/utils/assets";
import { formatDate, formatMoney, formatPercent, fullName } from "@/utils/format";
import { roleLabel } from "@/utils/roles";
import { useClasses, useCount, useCurrentYear, useExams, useFinanceDashboard, useSchool, useSectionReportCards, useSections, useStaffDirectory, useStudentsDirectory } from "./hooks";

export const EXAM_STATUS: Record<ExamStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PUBLISHED: { label: "Open for marks", tone: "brand" },
  LOCKED: { label: "Locked", tone: "success" },
};

const useDebounced = (text: string) => {
  const [value, setValue] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setValue(text.trim()), 400);
    return () => clearTimeout(t);
  }, [text]);
  return value;
};

/* ---------------------------------------------------------------- admin */

/** Monitoring for admins and super admins. Set-up and lifecycle actions stay on the web. */
export const AdminDashboard = () => {
  const students = useCount("students", (signal) => studentService.list({ limit: 1 }, signal));
  const teachers = useCount("teachers", (signal) => userService.list({ role: "TEACHER", limit: 1 }, signal));
  const year = useCurrentYear();
  const classes = useClasses();
  const exams = useExams();
  const finance = useFinanceDashboard();
  const notices = useNotices();

  const byStatus = useMemo(() => {
    const out: Record<ExamStatus, number> = { DRAFT: 0, PUBLISHED: 0, LOCKED: 0 };
    for (const e of exams.data ?? []) out[e.status] += 1;
    return out;
  }, [exams.data]);

  const refresh = () => [students, teachers, year, classes, exams, finance, notices].forEach((q) => q.refetch());

  return (
    <Screen onRefresh={refresh} refreshing={students.isRefetching || finance.isRefetching}>
      <HomeHeader subtitle={year.data ? `Academic year ${year.data.name}` : null} />
      <View className="flex-row gap-3">
        <StatCard icon={GraduationCap} label="Students" value={students.data !== undefined ? String(students.data) : "—"} hint={classes.data ? `${classes.data.length} classes` : null} />
        <StatCard icon={Users} label="Teachers" value={teachers.data !== undefined ? String(teachers.data) : "—"} tone="info" />
      </View>
      {finance.data ? (
        <PressableCard className="mt-3 gap-2" onPress={() => router.push("/admin/finance")}>
          <View className="flex-row items-center justify-between">
            <AppText variant="label">Fees · {finance.data.academicYear.name}</AppText>
            <Badge label={`${formatPercent(finance.data.kpis.collectionRate)} collected`} tone="success" />
          </View>
          <View className="flex-row justify-between">
            <View>
              <AppText variant="caption">Collected</AppText>
              <AppText variant="heading">{formatMoney(finance.data.kpis.collected)}</AppText>
            </View>
            <View className="items-end">
              <AppText variant="caption">Outstanding</AppText>
              <AppText variant="heading">{formatMoney(finance.data.kpis.outstanding)}</AppText>
            </View>
          </View>
          {finance.data.kpis.overdue.amount > 0 ? (
            <AppText className="text-sm text-red-600 dark:text-red-400">
              {formatMoney(finance.data.kpis.overdue.amount)} overdue from {finance.data.kpis.overdue.students} student(s)
            </AppText>
          ) : null}
        </PressableCard>
      ) : null}

      <SectionHeader title="Exams this year" />
      <View className="flex-row gap-2">
        {(Object.keys(EXAM_STATUS) as ExamStatus[]).map((s) => (
          <StatCard key={s} label={EXAM_STATUS[s].label} value={exams.data ? String(byStatus[s]) : "—"} tone={EXAM_STATUS[s].tone} />
        ))}
      </View>

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
      <AppText variant="caption" className="mt-6 text-center">
        Creating and changing records (students, exams, fees set-up) is done on the web.
      </AppText>
    </Screen>
  );
};

/* -------------------------------------------------------------- directory */

export const StudentDirectory = () => {
  const [text, setText] = useState("");
  const search = useDebounced(text);
  const query = useStudentsDirectory(search);
  const rows = query.data?.pages.flatMap((p) => p.rows) ?? [];
  const total = query.data?.pages[0]?.pagination.total;
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <OfflineBanner />
      <View className="px-4 pt-4">
        <TextField label="Search students" value={text} onChangeText={setText} placeholder="Name, username or admission number" returnKeyType="search" />
        {total !== undefined ? <AppText variant="caption" className="mt-1">{total} student(s)</AppText> : null}
      </View>
      {query.data === undefined ? (
        <View className="p-4">{query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : <SkeletonList />}</View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(s) => String(s.id)}
          contentContainerClassName="gap-2 p-4 pb-10"
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => query.refetch()}
          onEndReachedThreshold={0.4}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="py-4" /> : undefined}
          ListEmptyComponent={<EmptyState icon={GraduationCap} title="No students match" />}
          renderItem={({ item: s }) => (
            <Card className="flex-row items-center gap-3">
              <Avatar name={fullName(s)} uri={resolveAssetUrl(s.avatarUrl)} size={40} />
              <View className="flex-1">
                <AppText className="font-semibold">{fullName(s)}</AppText>
                <AppText variant="caption">
                  {s.class ? `${s.class} ${s.section ?? ""}` : "Not enrolled"}
                  {s.rollNumber ? ` · Roll ${s.rollNumber}` : ""}
                  {s.admissionNumber ? ` · ${s.admissionNumber}` : ""}
                </AppText>
              </View>
              {s.status !== "active" ? <Badge label={s.status} tone="neutral" /> : null}
            </Card>
          )}
        />
      )}
    </View>
  );
};

const STAFF_ROLES: StaffRole[] = ["TEACHER", "ADMIN", "EXAM_OFFICER", "ACCOUNTANT"];

export const StaffDirectory = () => {
  const [role, setRole] = useState<StaffRole>("TEACHER");
  const [text, setText] = useState("");
  const search = useDebounced(text);
  const query = useStaffDirectory(role, search);
  const rows = query.data?.pages.flatMap((p) => p.rows) ?? [];
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <Stack.Screen options={{ title: "Staff" }} />
      <OfflineBanner />
      <View className="gap-2 px-4 pt-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {STAFF_ROLES.map((r) => (
            <Chip key={r} label={roleLabel(r)} selected={r === role} onPress={() => setRole(r)} />
          ))}
        </ScrollView>
        <TextField label="Search staff" value={text} onChangeText={setText} returnKeyType="search" />
      </View>
      {query.data === undefined ? (
        <View className="p-4">{query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : <SkeletonList />}</View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(u) => String(u.id)}
          contentContainerClassName="gap-2 p-4 pb-10"
          onEndReachedThreshold={0.4}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          ListEmptyComponent={<EmptyState icon={Users} title="No staff here" />}
          renderItem={({ item: u }) => (
            <Card className="flex-row items-center gap-3">
              <Avatar name={fullName(u)} uri={resolveAssetUrl(u.avatarUrl)} size={40} />
              <View className="flex-1">
                <AppText className="font-semibold">{fullName(u)}</AppText>
                <AppText variant="caption">{[u.roles.map(roleLabel).join(", "), u.username, u.phone].filter(Boolean).join(" · ")}</AppText>
              </View>
              {u.status !== "active" ? <Badge label={u.status} tone="neutral" /> : null}
            </Card>
          )}
        />
      )}
    </View>
  );
};

/* ------------------------------------------------------------------ exams */

/** Exams of the current year and their state. Non-admins never get DRAFT exams from the API. */
export const ExamsList = ({ detailBase }: { detailBase?: string }) => {
  const query = useExams();
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      <QueryView query={query} isEmpty={(l) => l.length === 0} empty={<EmptyState icon={BookOpen} title="No exams this year" />}>
        {(list) => (
          <View className="gap-2">
            {list.map((e) => (
              <ExamCard key={e.id} exam={e} onPress={detailBase ? () => router.push(`${detailBase}/${e.id}` as Href) : undefined} />
            ))}
          </View>
        )}
      </QueryView>
      <AppText variant="caption" className="mt-4">
        Publishing, locking and unlocking exams is done on the web by the exam office.
      </AppText>
    </Screen>
  );
};

const ExamCard = ({ exam: e, onPress }: { exam: ExamRow; onPress?: () => void }) => {
  const body = (
    <>
      <View className="flex-row items-start justify-between gap-2">
        <AppText className="flex-1 font-semibold">{e.name}</AppText>
        <Badge label={EXAM_STATUS[e.status].label} tone={EXAM_STATUS[e.status].tone} />
      </View>
      <AppText variant="caption">
        {e.startDate ? `${formatDate(e.startDate, "bs")}${e.endDate ? ` – ${formatDate(e.endDate, "bs")}` : ""}` : "Dates not set"}
        {e._count ? ` · ${e._count.examSubjects} subjects` : ""}
      </AppText>
    </>
  );
  return onPress ? (
    <PressableCard className="gap-1" onPress={onPress}>
      {body}
    </PressableCard>
  ) : (
    <Card className="gap-1">{body}</Card>
  );
};

/** Admin: report cards of one class-section for an exam: generated, published, results. */
export const ExamReportCards = ({ examId }: { examId: number }) => {
  const exams = useExams();
  const classes = useClasses();
  const sections = useSections();
  const [classId, setClassId] = useState<number | null>(null);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const cls = classId ?? classes.data?.[0]?.id ?? null;
  const sec = sectionId ?? sections.data?.[0]?.id ?? null;
  const cards = useSectionReportCards(cls && sec ? { examId, classId: cls, sectionId: sec } : null);
  const exam = exams.data?.find((e) => e.id === examId);

  return (
    <Screen onRefresh={() => cards.refetch()} refreshing={cards.isRefetching}>
      <Stack.Screen options={{ title: exam?.name ?? "Exam" }} />
      {exam ? <Badge label={EXAM_STATUS[exam.status].label} tone={EXAM_STATUS[exam.status].tone} /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 py-3">
        {(classes.data ?? []).map((c) => (
          <Chip key={c.id} label={c.name} selected={c.id === cls} onPress={() => setClassId(c.id)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-3">
        {(sections.data ?? []).map((s) => (
          <Chip key={s.id} label={`Section ${s.name}`} selected={s.id === sec} onPress={() => setSectionId(s.id)} />
        ))}
      </ScrollView>
      <QueryView query={cards} isEmpty={(d) => d.students.length === 0} empty={<EmptyState title="No students in this class-section" />}>
        {(d) => (
          <>
            <View className="flex-row gap-2">
              <StatCard label="Generated" value={`${d.summary.reportCardsGenerated}/${d.summary.totalStudents}`} />
              <StatCard label="Published" value={String(d.summary.published)} tone="success" />
              <StatCard label="Passed" value={String(d.summary.passed)} tone="brand" />
            </View>
            <SectionHeader title="Students" />
            <Card className="p-0">
              {d.students.map((s, i) => (
                <View key={s.studentId}>
                  {i > 0 ? <Divider className="ml-4" /> : null}
                  <ListItem
                    title={`${s.rollNumber ? `${s.rollNumber}. ` : ""}${fullName(s)}`}
                    subtitle={`GPA ${typeof s.gpa === "number" ? s.gpa.toFixed(2) : "—"} · ${s.overallGrade ?? "—"} · ${formatPercent(s.percentage)}`}
                    right={
                      s.reportCard ? (
                        <Badge label={s.reportCard.isPublished ? "Published" : "Not published"} tone={s.reportCard.isPublished ? "success" : "neutral"} />
                      ) : (
                        <Badge label="No card" tone="neutral" />
                      )
                    }
                    onPress={s.reportCard ? () => router.push(`/shared/report-card/${s.studentId}/${examId}`) : undefined}
                  />
                </View>
              ))}
            </Card>
            <AppText variant="caption" className="mt-3">
              Generating and publishing report cards is done on the web.
            </AppText>
          </>
        )}
      </QueryView>
    </Screen>
  );
};

/* -------------------------------------------------------- classes, school */

export const ClassesView = () => {
  const classes = useClasses();
  const sections = useSections();
  return (
    <Screen onRefresh={() => classes.refetch()} refreshing={classes.isRefetching}>
      <Stack.Screen options={{ title: "Classes" }} />
      <QueryView query={classes} isEmpty={(l) => l.length === 0} empty={<EmptyState icon={School} title="No classes set up" />}>
        {(list) => (
          <>
            <AppText variant="muted">
              {list.length} classes · sections {(sections.data ?? []).map((s) => s.name).join(", ") || "—"}
            </AppText>
            <Card className="mt-3 p-0">
              {list.map((c, i) => (
                <View key={c.id}>
                  {i > 0 ? <Divider className="ml-16" /> : null}
                  <ListItem icon={School} title={c.name} subtitle={c.gradeLevel !== null ? `Grade level ${c.gradeLevel}` : null} />
                </View>
              ))}
            </Card>
          </>
        )}
      </QueryView>
    </Screen>
  );
};

export const SchoolProfile = () => {
  const query = useSchool();
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      <Stack.Screen options={{ title: "School" }} />
      <QueryView query={query}>
        {(s) => (
          <>
            <Card className="items-center gap-2">
              {resolveAssetUrl(s.logoUrl) ? <Avatar name={s.name} uri={resolveAssetUrl(s.logoUrl)} size={72} /> : null}
              <AppText variant="title" className="text-center">
                {s.name}
              </AppText>
              {s.tagline ? <AppText variant="muted">{s.tagline}</AppText> : null}
              <Badge label={`Code ${s.code}`} tone="neutral" />
            </Card>
            <SectionHeader title="Contact" />
            <Card className="p-0">
              {[s.address, s.phone, s.email, s.website].filter(Boolean).map((v, i) => (
                <View key={v}>
                  {i > 0 ? <Divider className="ml-4" /> : null}
                  <ListItem title={v!} onPress={v === s.website ? () => Linking.openURL(/^https?:/.test(v!) ? v! : `https://${v}`) : undefined} />
                </View>
              ))}
            </Card>
            <AppText variant="caption" className="mt-4">
              School settings, branding and report-card layout are changed on the web.
            </AppText>
          </>
        )}
      </QueryView>
    </Screen>
  );
};

/* ---------------------------------------------------------- exam officer */

export const ExamOfficerDashboard = () => {
  const exams = useExams();
  const students = useCount("students", (signal) => studentService.list({ limit: 1 }, signal));
  const open = (exams.data ?? []).filter((e) => e.status === "PUBLISHED");
  return (
    <Screen onRefresh={() => exams.refetch()} refreshing={exams.isRefetching}>
      <HomeHeader />
      <View className="flex-row gap-3">
        <StatCard icon={CalendarRange} label="Open for marks" value={exams.data ? String(open.length) : "—"} hint="published exams" tone="brand" />
        <StatCard icon={GraduationCap} label="Students" value={students.data !== undefined ? String(students.data) : "—"} />
      </View>
      <SectionHeader title="Exams" />
      <QueryView query={exams} isEmpty={(l) => l.length === 0} empty={<AppText variant="muted">No exams this year.</AppText>}>
        {(list) => (
          <View className="gap-2">
            {list.map((e) => (
              <ExamCard key={e.id} exam={e} onPress={e.status === "PUBLISHED" ? () => router.push("/exam/marks") : undefined} />
            ))}
          </View>
        )}
      </QueryView>
      <AppText variant="caption" className="mt-4">
        Marks-entry progress per subject isn&apos;t available from the server yet; open a subject to see who has marks.
      </AppText>
    </Screen>
  );
};

