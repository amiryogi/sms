import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { CalendarCheck } from "lucide-react-native";
import { AppText, Badge, Card, Chip, cn, EmptyState, ProgressBar, QueryView, Screen, SectionHeader, StaleNote } from "@/components/ui";
import type { AttendanceStatus, StudentAttendance } from "@/types/api";
import { formatAd, formatPercent } from "@/utils/format";
import { BS_MONTHS } from "@/utils/nepaliDate";
import { useStudentAttendance } from "./hooks";
import { ATTENDANCE_LABEL } from "./labels";

const CELL: Record<AttendanceStatus, string> = {
  present: "bg-ok-soft",
  late: "bg-warn-soft",
  absent: "bg-bad-soft",
  excused: "bg-info-soft",
};

/**
 * The attendance register by Nepali month (BS dates come from the server),
 * as on the web portal. The percentage follows the school's
 * late-counts-as-present rule, so it matches the report card.
 */
export const AttendanceView = ({ studentId }: { studentId: number }) => {
  const query = useStudentAttendance(studentId);
  return (
    <Screen onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      <QueryView
        query={query}
        isEmpty={(d) => d.attendances.length === 0}
        empty={<EmptyState icon={CalendarCheck} title="No attendance yet" message="Days appear here once the class teacher marks them." />}
      >
        {(data) => <Register data={data} />}
      </QueryView>
      <StaleNote updatedAt={query.dataUpdatedAt} isStale={query.fetchStatus === "paused"} />
    </Screen>
  );
};

const Register = ({ data }: { data: StudentAttendance }) => {
  const s = data.summary;
  const months = data.byMonth; // newest first
  const [monthKey, setMonthKey] = useState(() => (months[0] ? `${months[0].year}/${months[0].month}` : ""));

  const days = useMemo(() => {
    const [y, m] = monthKey.split("/");
    const prefix = `${y}/${String(m).padStart(2, "0")}/`;
    return data.attendances
      .filter((a) => a.bsDate?.startsWith(prefix))
      .sort((a, b) => (a.bsDate ?? "").localeCompare(b.bsDate ?? ""));
  }, [data.attendances, monthKey]);

  const notPresent = days.filter((d) => d.status !== "present");
  const pct = Number(s.percentage);

  return (
    <>
      <Card className="gap-3">
        <View className="flex-row items-end justify-between">
          <View>
            <AppText variant="caption">This year</AppText>
            <AppText variant="display">{formatPercent(s.percentage)}</AppText>
          </View>
          <AppText variant="muted">
            {s.attended} of {s.total} days
          </AppText>
        </View>
        <ProgressBar value={pct} tone={pct >= 90 ? "success" : pct >= 75 ? "warning" : "danger"} label={`${formatPercent(s.percentage)} attendance`} />
        <View className="flex-row flex-wrap gap-2">
          {(["present", "late", "absent", "excused"] as const).map((k) => (
            <Badge key={k} label={`${ATTENDANCE_LABEL[k].label} ${s[k]}`} tone={ATTENDANCE_LABEL[k].tone} />
          ))}
        </View>
        {s.countLateAsPresent ? <AppText variant="caption">Late days count as present, as on the report card.</AppText> : null}
      </Card>

      <SectionHeader title="By month" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-2">
        {months.map((m) => {
          const key = `${m.year}/${m.month}`;
          return <Chip key={key} label={`${BS_MONTHS[m.month - 1]} ${m.year}`} selected={key === monthKey} onPress={() => setMonthKey(key)} />;
        })}
      </ScrollView>

      <Card className="mt-2">
        <View className="flex-row flex-wrap gap-2" accessibilityLabel="Days of the month">
          {days.map((d) => {
            const info = ATTENDANCE_LABEL[d.status];
            return (
              <View
                key={d.id ?? d.attendanceDate}
                accessible
                accessibilityLabel={`${d.bsDate} BS, ${formatAd(d.attendanceDate)}: ${info.label}${d.remarks ? `, ${d.remarks}` : ""}`}
                className={cn("h-12 w-12 items-center justify-center rounded-lg", CELL[d.status])}
              >
                <AppText className="text-sm font-semibold">{Number(d.bsDate?.slice(8))}</AppText>
                <AppText variant="caption" className="font-semibold">
                  {info.short}
                </AppText>
              </View>
            );
          })}
        </View>
      </Card>

      {notPresent.length ? (
        <>
          <SectionHeader title="Not present" />
          <Card className="gap-2">
            {notPresent.map((d) => (
              <View key={d.id ?? d.attendanceDate} className="flex-row items-center justify-between gap-2">
                <View className="flex-1">
                  <AppText className="text-sm">
                    {d.bsDate} BS · {formatAd(d.attendanceDate)}
                  </AppText>
                  {d.remarks ? <AppText variant="caption">{d.remarks}</AppText> : null}
                </View>
                <Badge label={ATTENDANCE_LABEL[d.status].label} tone={ATTENDANCE_LABEL[d.status].tone} />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
};
