import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Save, Users, CheckCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { attendanceService } from "../../api/attendanceService";
import { calendarService } from "../../api/calendarService";
import { teacherService } from "../../api/teacherService";
import { studentService } from "../../api/studentService";
import { PageHeader, PageShell, Card, Badge, Button, Field, SelectInput, TextInput, NepaliDatePicker, Alert, Avatar, EmptyState, LoadingBlock, SegmentedControl, StatCard, StatGroup, toast } from "../../components/ui";
import { fullName, formatDate, todayAd } from "../../utils/format";
import { weekdayNameOf } from "../../lib/calendar/dateFormatter";
import { weekdayOf } from "../../lib/calendar/bsDateAdapter";
import { useDatePrefs } from "../../hooks/useDatePrefs";

/*
 * The marks of the register. `value` is what the API stores: do not change it.
 * `tone` is the status token a selected mark carries. Like a paper register,
 * only the exceptions are coloured: late warn, absent risk. Present is the
 * expected state of almost every row, so it is selected but quiet; colouring it
 * green would fill the column and hide the absences a teacher scans for.
 * Excused is not a status colour either. The save bar's summary still shows
 * the present count in ok.
 */
const STATUSES = [
  { value: "present", short: "P", label: "Present", tone: "default" },
  { value: "absent", short: "A", label: "Absent", tone: "risk" },
  { value: "late", short: "L", label: "Late", tone: "warn" },
  { value: "excused", short: "E", label: "Excused", tone: "default" },
];

// One segmented-control option per mark: the letter is what is seen, the word
// is what a screen reader announces as the option's name.
const MARK_OPTIONS = STATUSES.map((s) => ({
  value: s.value,
  tone: s.tone,
  label: (
    <>
      <span aria-hidden="true" className="inline-block w-4 text-center">{s.short}</span>
      <span className="sr-only">{s.label}</span>
    </>
  ),
}));

// Counts that need attention carry their status colour; the rest are ink.
const countTone = (status, n) => (n > 0 && status === "absent" ? "risk" : n > 0 && status === "late" ? "warn" : "ink");

// The register is for a day in Nepal, whatever the device's own time zone.
const localToday = todayAd;

// The students endpoint pages by 10 by default; ask for the maximum it allows.
const MAX_SECTION_SIZE = 100;

const Attendance = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const today = localToday();
  const prefs = useDatePrefs();
  // Calendar Settings: no register on weekly holidays and holidays (the server enforces it).
  const blocksOnHolidays = user?.school?.calendar?.blockAttendanceOnNonWorkingDays !== false;
  const [dayInfo, setDayInfo] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [records, setRecords] = useState([]);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // ?class=<classId>-<sectionId> (from the dashboard) preselects a class.
  const [filters, setFilters] = useState(() => {
    const [classId = "", sectionId = ""] = (searchParams.get("class") || "").split("-");
    return { classId, sectionId, date: today };
  });

  useEffect(() => {
    teacherService
      .getTeacherAssignments({ userId: user?.id })
      .then((res) => setAssignments(res.data || []))
      .catch(() => toast.error("Could not load your classes"));
  }, [user?.id]);

  // One option per class-section the teacher teaches.
  const classSectionOptions = useMemo(
    () => [
      ...new Map(
        assignments.map((a) => [
          `${a.classSubject?.classId}-${a.sectionId}`,
          { value: `${a.classSubject?.classId}-${a.sectionId}`, label: `${a.classSubject?.class?.name} ${a.section?.name}` },
        ]),
      ).values(),
    ],
    [assignments],
  );

  useEffect(() => {
    const { classId, sectionId, date } = filters;
    if (!classId || !sectionId || !date) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [studentsRes, attendanceRes] = await Promise.all([
          studentService.getStudents({ classId, sectionId, limit: MAX_SECTION_SIZE }),
          attendanceService.getAttendance({ classId, sectionId, date }),
        ]);
        if (cancelled) return;
        const studentList = studentsRes.data?.students || studentsRes.data || [];
        const existing = attendanceRes.data || [];
        setAlreadyTaken(existing.length > 0);
        setRecords(
          studentList
            .map((s) => {
              const found = existing.find((a) => a.studentId === s.id);
              return {
                studentId: s.id,
                rollNumber: s.rollNumber,
                name: fullName(s),
                avatarUrl: s.user?.avatarUrl || s.avatarUrl,
                status: found?.status || "present",
                remarks: found?.remarks || "",
              };
            })
            .sort((a, b) => (a.rollNumber || 999) - (b.rollNumber || 999)),
        );
      } catch (error) {
        if (!cancelled) toast.error(error.response?.data?.message || "Could not load students");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  // Is the chosen day a working day for this class? (weekly holiday, school holiday)
  useEffect(() => {
    const { classId, sectionId, date } = filters;
    setDayInfo(null);
    if (!date) return undefined;
    let cancelled = false;
    calendarService
      .getWorkingDay({ date, ...(classId ? { classId } : {}), ...(sectionId ? { sectionId } : {}) })
      .then((res) => !cancelled && setDayInfo(res.data))
      .catch(() => {}); // the save itself is still checked by the server
    return () => {
      cancelled = true;
    };
  }, [filters]);
  const dayBlocked = Boolean(dayInfo?.blocksAttendance);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s.value, 0]));
    records.forEach((r) => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [records]);

  const update = (studentId, patch) => setRecords((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)));
  const markAll = (status) => setRecords((prev) => prev.map((r) => ({ ...r, status })));

  const handleSave = async () => {
    setSaving(true);
    try {
      await attendanceService.markAttendance({
        classId: parseInt(filters.classId),
        sectionId: parseInt(filters.sectionId),
        date: filters.date,
        attendanceRecords: records.map((r) => ({ studentId: r.studentId, status: r.status, remarks: r.remarks })),
      });
      setAlreadyTaken(true);
      toast.success(`Attendance saved: ${counts.present} present, ${counts.absent} absent`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save attendance");
    } finally {
      setSaving(false);
    }
  };

  const selected = filters.classId ? `${filters.classId}-${filters.sectionId}` : "";
  const selectedLabel = classSectionOptions.find((o) => o.value === selected)?.label;

  return (
    <PageShell>
      <PageHeader title="Attendance" description="Take the daily register for the classes you teach." />

      <Card>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Field label="Class and section" htmlFor="att-class" data-guide="attendance.class">
            <SelectInput
              id="att-class"
              value={selected}
              onChange={(e) => {
                const [classId = "", sectionId = ""] = e.target.value ? e.target.value.split("-") : [];
                setRecords([]);
                setFilters((prev) => ({ ...prev, classId, sectionId }));
              }}
            >
              <option value="">{classSectionOptions.length ? "Select a class" : "No classes assigned to you"}</option>
              {classSectionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Date" htmlFor="att-date" data-guide="attendance.date" hint={filters.date === today ? "Today" : undefined}>
            <NepaliDatePicker
              id="att-date"
              value={filters.date}
              max={today}
              clearable={false}
              isDateDisabled={(ad) => blocksOnHolidays && prefs.weeklyHolidayDays.includes(weekdayOf(ad))}
              onChange={(ad) => setFilters((prev) => ({ ...prev, date: ad || today }))}
            />
          </Field>
        </div>
      </Card>

      {dayInfo && !dayInfo.isWorkingDay && (
        <Alert tone={dayBlocked ? "warning" : "info"} title={dayInfo.reason}>
          {dayBlocked
            ? "Attendance is not taken on this day. Choose a working day."
            : "This is not a working day on the school calendar. You can still save the register."}
        </Alert>
      )}

      {!filters.classId ? (
        <Card>
          <EmptyState icon={Users} title="Choose a class" description="Pick one of your classes to take its register." />
        </Card>
      ) : loading ? (
        <Card><LoadingBlock text="Loading students…" /></Card>
      ) : records.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title="No students" description="No students are enrolled in this section for the current year." />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4">
            <div className="mr-auto min-w-0">
              <h2 className="text-base font-semibold text-slate-900">{selectedLabel}</h2>
              <p className="text-sm text-slate-500">
                {weekdayNameOf(filters.date, prefs.language)}, {formatDate(filters.date, "", { calendar: "both" })}
              </p>
            </div>
            {alreadyTaken ? <Badge tone="success" dot>Taken</Badge> : <Badge tone="warning" dot>Not taken yet</Badge>}
            <Button size="sm" variant="secondary" icon={CheckCheck} onClick={() => markAll("present")} data-guide="attendance.allPresent">All present</Button>
          </div>

          {/* The day's tally, ruled into the head of the register. */}
          <StatGroup columns={4} surface="well" size="sm" className="border-b border-slate-200">
            {STATUSES.map((s) => (
              <StatCard key={s.value} label={s.label} value={counts[s.value]} tone={countTone(s.value, counts[s.value])} />
            ))}
          </StatGroup>

          {/* The register: one ruled line per student, in roll order. */}
          <div className="flex items-center gap-x-3 border-b border-slate-200 bg-slate-50 px-5 py-2 text-xs font-medium text-slate-500" aria-hidden="true">
            <span className="w-8 text-right">Roll</span>
            <span className="flex-1 pl-9">Student</span>
            <span>Mark</span>
          </div>
          <ul className="divide-y divide-slate-200">
            {records.map((r) => (
              <li key={r.studentId} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-1 hover:bg-slate-50">
                <span className="w-8 text-right text-sm text-slate-500 tabular-nums">{r.rollNumber || "—"}</span>
                <Avatar src={r.avatarUrl} name={r.name} size="xs" />
                <span className="min-w-32 flex-1 truncate text-sm font-medium text-slate-900">{r.name}</span>
                {r.status !== "present" && (
                  <TextInput
                    value={r.remarks}
                    onChange={(e) => update(r.studentId, { remarks: e.target.value })}
                    placeholder="Reason (optional)"
                    aria-label={`Reason for ${r.name}`}
                    className="h-9 w-44 text-xs"
                  />
                )}
                <SegmentedControl
                  label={`Attendance for ${r.name}`}
                  options={MARK_OPTIONS}
                  value={r.status}
                  onChange={(status) => update(r.studentId, { status })}
                  className="ml-auto"
                />
              </li>
            ))}
          </ul>

          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
            <p className="text-sm text-slate-600 tabular-nums">
              {records.length} students: <span className="font-medium text-ok">{counts.present} present</span>
              {counts.absent > 0 && (
                <>
                  , <span className="font-medium text-risk">{counts.absent} absent</span>
                </>
              )}
            </p>
            <Button icon={Save} loading={saving} disabled={dayBlocked} onClick={handleSave} data-guide="attendance.save">Save Attendance</Button>
          </div>
        </Card>
      )}
    </PageShell>
  );
};

export default Attendance;
