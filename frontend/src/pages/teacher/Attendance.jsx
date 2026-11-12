import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarCheck, Check, X, Clock, ShieldCheck, Save, Users, CheckCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { attendanceService } from "../../api/attendanceService";
import { teacherService } from "../../api/teacherService";
import { studentService } from "../../api/studentService";
import { PageHeader, Card, Badge, Button, Field, SelectInput, TextInput, Avatar, EmptyState, LoadingBlock, toast } from "../../components/ui";
import { cn } from "../../lib/cn";
import { fullName } from "../../utils/format";

const STATUSES = [
  { value: "present", short: "P", label: "Present", icon: Check, on: "bg-emerald-600 text-white ring-emerald-600", soft: "bg-emerald-50 text-emerald-700" },
  { value: "absent", short: "A", label: "Absent", icon: X, on: "bg-red-600 text-white ring-red-600", soft: "bg-red-50 text-red-700" },
  { value: "late", short: "L", label: "Late", icon: Clock, on: "bg-amber-500 text-white ring-amber-500", soft: "bg-amber-50 text-amber-800" },
  { value: "excused", short: "E", label: "Excused", icon: ShieldCheck, on: "bg-sky-600 text-white ring-sky-600", soft: "bg-sky-50 text-sky-700" },
];

// Today's date in the user's own time zone (toISOString would give UTC's date).
const localToday = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// The students endpoint pages by 10 by default; ask for the maximum it allows.
const MAX_SECTION_SIZE = 100;

const Attendance = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const today = localToday();
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
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader icon={CalendarCheck} title="Attendance" description="Take the daily register for the classes you teach." />

      <Card>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Field label="Class and section" htmlFor="att-class">
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
          <Field label="Date" htmlFor="att-date" hint={filters.date === today ? "Today" : undefined}>
            <TextInput id="att-date" type="date" value={filters.date} max={today} onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))} />
          </Field>
        </div>
      </Card>

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
                {new Date(`${filters.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            {alreadyTaken ? <Badge tone="success" dot>Taken</Badge> : <Badge tone="warning" dot>Not taken yet</Badge>}
            <Button size="sm" variant="secondary" icon={CheckCheck} onClick={() => markAll("present")}>All present</Button>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4">
            {STATUSES.map((s) => (
              <div key={s.value} className="flex items-center gap-3 bg-white px-5 py-3">
                <span className={cn("inline-flex size-8 items-center justify-center rounded-lg", s.soft)}>
                  <s.icon size={16} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-lg leading-tight font-semibold text-slate-900 tabular-nums">{counts[s.value]}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <ul className="divide-y divide-slate-100">
            {records.map((r) => (
              <li key={r.studentId} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5">
                <span className="w-8 text-sm text-slate-400 tabular-nums">{r.rollNumber || "—"}</span>
                <Avatar src={r.avatarUrl} name={r.name} size="sm" />
                <span className="min-w-32 flex-1 truncate text-sm font-medium text-slate-900">{r.name}</span>
                {r.status !== "present" && (
                  <TextInput
                    value={r.remarks}
                    onChange={(e) => update(r.studentId, { remarks: e.target.value })}
                    placeholder="Reason (optional)"
                    aria-label={`Reason for ${r.name}`}
                    className="h-8 w-44 text-xs"
                  />
                )}
                <div role="radiogroup" aria-label={`Attendance for ${r.name}`} className="ml-auto flex gap-1">
                  {STATUSES.map((s) => {
                    const on = r.status === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        title={s.label}
                        aria-label={s.label}
                        onClick={() => update(r.studentId, { status: s.value })}
                        className={cn(
                          "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold ring-1 transition-colors ring-inset",
                          on ? s.on : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50",
                        )}
                      >
                        {s.short}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>

          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
            <p className="text-sm text-slate-600">
              {records.length} students · <span className="text-emerald-700">{counts.present} present</span>
              {counts.absent > 0 && <span className="text-red-700"> · {counts.absent} absent</span>}
            </p>
            <Button icon={Save} loading={saving} onClick={handleSave}>Save Attendance</Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Attendance;
