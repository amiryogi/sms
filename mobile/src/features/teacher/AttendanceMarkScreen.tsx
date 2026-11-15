import { useMemo, useRef, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, View } from "react-native";
import { useNetworkState } from "expo-network";
import { ChevronLeft, ChevronRight, ClipboardCheck, Save } from "lucide-react-native";
import type { ApiFailure } from "@/api/errors";
import { AppText, Badge, Button, Chip, cn, EmptyState, ErrorState, IconButton, OfflineBanner, SkeletonList } from "@/components/ui";
import { ATTENDANCE_LABEL } from "@/features/portal/labels";
import type { AttendanceStatus } from "@/types/api";
import { formatAd } from "@/utils/format";
import { formatBs, kathmanduToday } from "@/utils/nepaliDate";
import { changedCount, linesFromServer, markAll, setStatus, tally, toPayload, type AttendanceLine } from "./attendanceSheet";
import { useDraft, useMarkAttendance, useSectionDay, useTeacherAssignments } from "./hooks";
import { sectionLabel, sectionsFrom } from "./sections";

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];
// Selected: the status's soft fill, a 2 px border and bold text in its tone.
// Tokens, so it reads in light and dark alike.
const STATUS_ON: Record<AttendanceStatus, { box: string; text: string }> = {
  present: { box: "border-ok bg-ok-soft", text: "text-ok" },
  absent: { box: "border-bad bg-bad-soft", text: "text-bad" },
  late: { box: "border-warn bg-warn-soft", text: "text-warn" },
  excused: { box: "border-info bg-info-soft", text: "text-info" },
};

const shiftDay = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Mark a section's attendance for a day. Sections come only from the teacher's
 * own current-year assignments; the server checks the assignment again.
 * Nothing is sent without the teacher pressing Save, and never offline.
 */
export const AttendanceMarkScreen = () => {
  const assignments = useTeacherAssignments();
  const sections = useMemo(() => sectionsFrom(assignments.data ?? []), [assignments.data]);
  const [sectionKey, setSectionKey] = useState<string | null>(null);
  const today = kathmanduToday();
  const [date, setDate] = useState(today);
  const section = sections.find((s) => s.key === sectionKey) ?? sections[0] ?? null;

  if (assignments.data === undefined) {
    return (
      <View className="flex-1 bg-canvas p-4">
        {assignments.isError ? <ErrorState error={assignments.error} onRetry={() => assignments.refetch()} /> : <SkeletonList />}
      </View>
    );
  }
  if (!section) {
    return (
      <View className="flex-1 bg-canvas">
        <EmptyState icon={ClipboardCheck} title="No classes assigned" message="You have no class this academic year. Ask the school office." />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <OfflineBanner />
      {sections.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0" contentContainerClassName="gap-2 px-4 pt-3">
          {sections.map((s) => (
            <Chip key={s.key} label={sectionLabel(s)} selected={s.key === section.key} onPress={() => setSectionKey(s.key)} />
          ))}
        </ScrollView>
      ) : null}
      <View className="mx-4 my-3 flex-row items-center gap-1 rounded-2xl border border-line bg-surface p-1">
        <IconButton icon={ChevronLeft} label="Previous day" onPress={() => setDate(shiftDay(date, -1))} />
        <View className="flex-1 items-center">
          <AppText className="text-lg font-bold">{formatBs(`${date}T00:00:00.000Z`)}</AppText>
          <AppText variant="caption">
            {date === today ? "Today, " : ""}
            {formatAd(`${date}T00:00:00.000Z`)}
          </AppText>
        </View>
        <IconButton icon={ChevronRight} label="Next day" disabled={date >= today} onPress={() => setDate(shiftDay(date, 1))} />
      </View>
      {/* Keyed by section and day: nothing carries over between registers. */}
      <Register key={`${section.key}:${date}`} classId={section.classId} sectionId={section.sectionId} date={date} title={sectionLabel(section)} />
    </View>
  );
};

const Register = ({ classId, sectionId, date, title }: { classId: number; sectionId: number; date: string; title: string }) => {
  const day = useSectionDay(classId, sectionId, date);
  const save = useMarkAttendance();
  const network = useNetworkState();
  const offline = network.isConnected === false;
  const { draft, loaded, save: saveDraft, clear: clearDraft } = useDraft<AttendanceLine[]>(`attendance.${classId}.${sectionId}.${date}`);

  const saved = useMemo(() => (day.data ? linesFromServer(day.data) : []), [day.data]);
  // What is on screen: the teacher's edits, else an unsent draft for this exact
  // register, else the server's day.
  const [edited, setEdited] = useState<AttendanceLine[] | null>(null);
  const [savedAt, setSavedAt] = useState(0);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const sending = useRef(false);

  const draftUsable = useMemo(() => {
    if (!draft || !day.data) return false;
    const ids = new Set(saved.map((l) => l.studentId));
    return draft.length === saved.length && draft.every((l) => ids.has(l.studentId)) && changedCount(draft, saved) > 0;
  }, [draft, day.data, saved]);
  const restored = edited === null && draftUsable;
  const lines = edited ?? (draftUsable && draft ? draft : saved);
  // Right after a save, wait for the refetched day: never show the pre-save copy.
  const reloading = savedAt > 0 && day.dataUpdatedAt < savedAt;

  const edit = (next: AttendanceLine[]) => {
    setEdited(next);
    setMessage(null);
    saveDraft(next);
  };

  if (day.data === undefined || !loaded || !lines || reloading) {
    return <View className="p-4">{day.isError ? <ErrorState error={day.error} onRetry={() => day.refetch()} /> : <SkeletonList rows={6} />}</View>;
  }
  if (lines.length === 0) return <EmptyState title="No students enrolled" message={`${title} has no active students this year.`} />;

  const t = tally(lines);
  const changes = changedCount(lines, saved);
  const alreadyMarked = saved.some((l) => l.status);

  const submit = () => {
    if (sending.current) return;
    let payload;
    try {
      payload = toPayload(classId, sectionId, date, lines);
    } catch (e) {
      setMessage({ tone: "danger", text: (e as Error).message });
      return;
    }
    Alert.alert(
      alreadyMarked ? "Update attendance?" : "Save attendance?",
      `${title}, ${formatBs(`${date}T00:00:00.000Z`)}\nPresent ${t.present}, absent ${t.absent}, late ${t.late}, excused ${t.excused}`,
      [
        { text: "Check again", style: "cancel" },
        {
          text: "Save",
          onPress: () => {
            sending.current = true;
            save.mutate(payload, {
              onSuccess: () => {
                clearDraft();
                setEdited(null);
                setSavedAt(Date.now()); // show the refetched day, not this copy
                setMessage({ tone: "success", text: `Saved for ${payload.attendanceRecords.length} students.` });
              },
              onError: (e) => setMessage({ tone: "danger", text: (e as ApiFailure).message }),
              onSettled: () => {
                sending.current = false;
              },
            });
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1">
      <View className="gap-2 px-4">
        {restored ? (
          <View className="flex-row items-center justify-between gap-2 rounded-lg bg-warn-soft p-3">
            <AppText className="flex-1 text-sm">Unsent changes from earlier are shown. Save them or discard.</AppText>
            <Button
              title="Discard"
              size="sm"
              variant="ghost"
              onPress={() => {
                clearDraft();
                setEdited(null);
              }}
            />
          </View>
        ) : null}
        <View className="flex-row flex-wrap items-center gap-2">
          <Badge label={`Present ${t.present}`} tone="success" />
          <Badge label={`Absent ${t.absent}`} tone="danger" />
          <Badge label={`Late ${t.late}`} tone="warning" />
          <Badge label={`Excused ${t.excused}`} tone="info" />
          {t.unmarked ? <Badge label={`${t.unmarked} not marked`} tone="neutral" /> : null}
          {alreadyMarked && changes === 0 ? <Badge label="Saved" tone="brand" /> : null}
        </View>
        {t.unmarked ? (
          <Button title="Mark everyone else present" variant="secondary" size="sm" onPress={() => edit(markAll(lines, "present", true))} />
        ) : null}
      </View>

      <FlatList
        data={lines}
        keyExtractor={(l) => String(l.studentId)}
        contentContainerClassName="gap-3 p-4 pb-40"
        refreshing={day.isRefetching}
        onRefresh={changes ? undefined : () => day.refetch()}
        renderItem={({ item }) => (
          <View className="gap-3 rounded-2xl border border-line bg-surface p-4">
            <View className="flex-row items-center gap-3">
              <View className="min-h-10 min-w-10 items-center justify-center rounded-lg bg-sunken px-1.5" accessibilityElementsHidden importantForAccessibility="no">
                <AppText className="text-sm font-bold text-ink-muted">{item.rollNumber ?? "-"}</AppText>
              </View>
              <AppText className="flex-1 text-base font-semibold" numberOfLines={2}>
                {item.name}
              </AppText>
            </View>
            <View className="flex-row gap-2" accessibilityRole="radiogroup" accessibilityLabel={`Attendance for ${item.name}`}>
              {STATUSES.map((s) => {
                const on = item.status === s;
                return (
                  <Pressable
                    key={s}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${ATTENDANCE_LABEL[s].label}, ${item.name}`}
                    onPress={() => edit(setStatus(lines, item.studentId, s))}
                    className={cn(
                      "min-h-12 flex-1 items-center justify-center rounded-xl border-2 px-1 py-2",
                      on ? STATUS_ON[s].box : "border-line bg-surface active:bg-sunken",
                    )}
                  >
                    <AppText numberOfLines={1} adjustsFontSizeToFit className={cn("text-sm", on ? cn("font-bold", STATUS_ON[s].text) : "font-semibold text-ink-muted")}>
                      {ATTENDANCE_LABEL[s].label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      />

      <View className="absolute bottom-0 left-0 right-0 gap-2 border-t border-line bg-surface p-4">
        {message ? (
          <AppText accessibilityRole="alert" className={cn("text-sm", message.tone === "success" ? "text-ok" : "text-bad")}>
            {message.text}
          </AppText>
        ) : offline ? (
          <AppText variant="caption">You&apos;re offline. This register stays on this phone until you can save.</AppText>
        ) : changes ? (
          <AppText variant="caption">{changes} change(s) not saved yet.</AppText>
        ) : null}
        <Button
          title={alreadyMarked ? "Update attendance" : "Save attendance"}
          icon={Save}
          loading={save.isPending}
          disabled={offline || save.isPending || changes === 0 || t.unmarked > 0}
          onPress={submit}
          fullWidth
        />
      </View>
    </View>
  );
};
