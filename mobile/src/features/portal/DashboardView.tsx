import { View } from "react-native";
import { router, type Href } from "expo-router";
import { Award, BookOpen, CalendarCheck, ClipboardList, Megaphone, Wallet } from "lucide-react-native";
import {
  AppText,
  Badge,
  Card,
  Divider,
  EmptyState,
  ListItem,
  PressableCard,
  QueryView,
  Screen,
  SectionHeader,
  StaleNote,
  StatCard,
} from "@/components/ui";
import { HomeHeader } from "@/features/dashboard/HomeHeader";
import { useTheme } from "@/theme/ThemeProvider";
import type { StudentOverview } from "@/types/api";
import { formatDate, formatMoney, formatPercent, formatRelativeDay } from "@/utils/format";
import { useNotices, useOverview } from "./hooks";
import { FEE_STATUS, PRIORITY } from "./labels";

type Props = {
  studentId: number;
  /** The area's base path, for links ("/student" or "/parent"). */
  base: "/student" | "/parent";
  /** Parents see "Asha's" wording; students "your". */
  childName?: string;
};

/** Home for a student, or for a parent's chosen child: one overview read plus the latest notices. */
export const DashboardView = ({ studentId, base, childName }: Props) => {
  const overview = useOverview(studentId);
  const notices = useNotices();
  const refreshing = overview.isRefetching || notices.isRefetching;

  const onRefresh = () => {
    overview.refetch();
    notices.refetch();
  };

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <QueryView query={overview}>
        {(data) => (
          <>
            <HomeHeader
              subtitle={
                data.enrolment
                  ? `${childName ? `${childName} · ` : ""}${data.enrolment.class.name} ${data.enrolment.section.name}${
                      data.enrolment.rollNumber ? ` · Roll ${data.enrolment.rollNumber}` : ""
                    }`
                  : (childName ?? null)
              }
            />
            {!data.enrolment ? (
              <EmptyState title="Not enrolled this year" message="Results, attendance and fees appear once the school enrols the student in a class." />
            ) : (
              <Body data={data} base={base} />
            )}
            <StaleNote updatedAt={overview.dataUpdatedAt} isStale={overview.isError || overview.fetchStatus === "paused"} />
          </>
        )}
      </QueryView>

      <SectionHeader
        title="Notices"
        action={
          <AppText variant="label" className="text-brand-700 dark:text-brand-300" onPress={() => router.push(`${base}/notices` as Href)}>
            See all
          </AppText>
        }
      />
      <Card className="p-0">
        {notices.data?.pages[0]?.rows.length ? (
          notices.data.pages[0].rows.slice(0, 3).map((n, i) => (
            <View key={n.id}>
              {i > 0 ? <Divider className="ml-16" /> : null}
              <ListItem
                icon={Megaphone}
                title={n.title}
                subtitle={formatDate(n.publishedAt ?? n.createdAt)}
                right={n.priority === "high" || n.priority === "urgent" ? <Badge label={PRIORITY[n.priority].label} tone={PRIORITY[n.priority].tone} /> : null}
                onPress={() => router.push(`/shared/notice/${n.id}`)}
              />
            </View>
          ))
        ) : (
          <AppText variant="muted" className="p-4">
            {notices.isLoading ? "Loading…" : "No notices right now."}
          </AppText>
        )}
      </Card>
    </Screen>
  );
};

const Body = ({ data, base }: { data: StudentOverview; base: Props["base"] }) => {
  const { colors } = useTheme();
  const a = data.attendance;
  const fee = data.fees;
  return (
    <>
      <View className="flex-row gap-3">
        <StatCard
          icon={CalendarCheck}
          label="Attendance"
          value={a && a.total > 0 ? formatPercent(a.percentage) : "—"}
          hint={a && a.total > 0 ? `${a.attended ?? a.present} of ${a.total} days` : "Not marked yet"}
          tone="success"
        />
        <StatCard
          icon={Award}
          label="Latest result"
          value={data.latestResult?.overallGrade ?? "—"}
          hint={data.latestResult ? `${data.latestResult.examName}${data.latestResult.percentage !== null ? ` · ${formatPercent(data.latestResult.percentage)}` : ""}` : "None published"}
          tone="brand"
        />
      </View>

      {fee ? (
        <PressableCard
          className="mt-3 flex-row items-center gap-3"
          onPress={() => router.push(`${base}/fees` as Href)}
          accessibilityLabel={`Fees: balance ${formatMoney(fee.balance)}, ${FEE_STATUS[fee.status].label}`}
        >
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950">
            <Wallet size={20} color={colors.warning} />
          </View>
          <View className="flex-1">
            <AppText variant="caption">Fee balance</AppText>
            <AppText variant="heading">{formatMoney(fee.balance)}</AppText>
            {fee.nextDue ? (
              <AppText variant="caption">
                Next: {formatMoney(fee.nextDue.balance)} ({fee.nextDue.feeType}){fee.nextDue.dueDate ? `, due ${formatDate(fee.nextDue.dueDate, "bs")}` : ""}
              </AppText>
            ) : null}
          </View>
          <Badge label={FEE_STATUS[fee.status].label} tone={FEE_STATUS[fee.status].tone} />
        </PressableCard>
      ) : null}

      <SectionHeader title="Assignments due" />
      <Card className="p-0">
        {data.assignments.length ? (
          data.assignments.slice(0, 3).map((x, i) => (
            <View key={x.id}>
              {i > 0 ? <Divider className="ml-16" /> : null}
              <ListItem
                icon={ClipboardList}
                title={x.title}
                subtitle={`${x.subject}${x.dueDate ? ` · due ${formatRelativeDay(x.dueDate)}` : ""}`}
                right={x.submitted ? <Badge label="Submitted" tone="success" /> : null}
                onPress={() => router.push(`/shared/assignment/${x.id}?studentId=${data.student.id}`)}
              />
            </View>
          ))
        ) : (
          <AppText variant="muted" className="p-4">
            Nothing due.
          </AppText>
        )}
      </Card>

      {data.upcomingExams.length ? (
        <>
          <SectionHeader title="Exams" />
          <Card className="p-0">
            {data.upcomingExams.map((e, i) => (
              <View key={e.id}>
                {i > 0 ? <Divider className="ml-16" /> : null}
                <ListItem
                  icon={BookOpen}
                  title={e.name}
                  subtitle={e.startDate ? `${formatDate(e.startDate, "bs")}${e.endDate ? ` – ${formatDate(e.endDate, "bs")}` : ""}` : "Dates to be announced"}
                />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
};
