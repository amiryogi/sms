import React, { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Check, X, Clock, ShieldCheck } from "lucide-react";
import { attendanceService } from "../../api/attendanceService";
import { Card, CardHeader, Tabs, EmptyState, LoadingBlock } from "../ui";
import { Progress } from "../shadcn/progress";
import { Tooltip, TooltipTrigger, TooltipContent } from "../shadcn/tooltip";
import { cn } from "../../lib/cn";
import { formatDate } from "../../utils/format";

const STATUS = {
  present: { short: "P", label: "Present", icon: Check, cell: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  late: { short: "L", label: "Late", icon: Clock, cell: "bg-amber-100 text-amber-800 ring-amber-200" },
  absent: { short: "A", label: "Absent", icon: X, cell: "bg-red-100 text-red-800 ring-red-200" },
  excused: { short: "E", label: "Excused", icon: ShieldCheck, cell: "bg-sky-100 text-sky-800 ring-sky-200" },
};

/**
 * A student's attendance for the current year: the rate (using the school's
 * late-counts-as-present rule, decided by the server), totals, and a register
 * for each Nepali month. Each day shows a letter as well as a colour, and a
 * tooltip with the date. Shared by the student and parent portals.
 */
const AttendanceView = ({ studentId }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    let alive = true;
    attendanceService
      .getStudentAttendanceSummary(studentId)
      .then((res) => alive && setData(res.data))
      .catch((err) => alive && setError(err.response?.data?.message || "Could not load attendance"));
    return () => {
      alive = false;
    };
  }, [studentId]);

  // Records grouped by BS month key "2083/07".
  const byMonth = useMemo(() => {
    const map = new Map();
    for (const a of data?.attendances || []) {
      if (!a.bsDate) continue;
      const key = a.bsDate.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    for (const rows of map.values()) rows.sort((x, y) => x.bsDate.localeCompare(y.bsDate));
    return map;
  }, [data]);

  if (error) return <Card><EmptyState icon={CalendarCheck} title="Attendance unavailable" description={error} /></Card>;
  if (!data) return <Card><LoadingBlock text="Loading attendance…" /></Card>;

  const { summary } = data;
  const months = data.byMonth || [];
  const selected = month || (months[0] ? `${months[0].year}/${String(months[0].month).padStart(2, "0")}` : null);
  const selectedMeta = months.find((m) => `${m.year}/${String(m.month).padStart(2, "0")}` === selected);
  const days = byMonth.get(selected) || [];
  const pct = Number(summary.percentage) || 0;

  if (!summary.total) {
    return <Card><EmptyState icon={CalendarCheck} title="No attendance yet" description="Days appear here once teachers take the register." /></Card>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Attendance this year</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">{pct.toFixed(1)}%</p>
            <p className="mt-1 text-sm text-slate-500">
              {summary.attended} of {summary.total} school days
              {summary.countLateAsPresent ? " (late counts as present)" : ""}
            </p>
          </div>
          <dl className="grid grid-cols-4 gap-3 text-center">
            {Object.entries(STATUS).map(([key, s]) => (
              <div key={key} className="min-w-16 rounded-xl bg-slate-50 px-3 py-2">
                <dt className="flex items-center justify-center gap-1 text-xs text-slate-500">
                  <s.icon size={12} aria-hidden="true" /> {s.label}
                </dt>
                <dd className="text-lg font-semibold text-slate-900 tabular-nums">{summary[key] || 0}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Progress value={pct} className="mt-4" aria-label={`Attendance ${pct.toFixed(1)}%`} indicatorClassName={pct < 75 ? "bg-red-500" : pct < 90 ? "bg-amber-500" : "bg-emerald-600"} />
      </Card>

      <Card>
        <CardHeader title="Register by month" description="Days the register was taken, by Nepali date. Hover or focus a day for details." />
        <Tabs
          size="sm"
          value={selected}
          onChange={setMonth}
          tabs={months.map((m) => ({ value: `${m.year}/${String(m.month).padStart(2, "0")}`, label: m.label }))}
          className="mb-4"
        />
        {selectedMeta && (
          <p className="mb-3 text-sm text-slate-600">
            {selectedMeta.attended} of {selectedMeta.total} days · <span className="font-semibold text-slate-900">{selectedMeta.percentage}%</span>
          </p>
        )}
        <ul className="flex flex-wrap gap-1.5" aria-label={`Register for ${selectedMeta?.label || ""}`}>
          {days.map((d) => {
            const s = STATUS[d.status] || STATUS.present;
            return (
              <li key={d.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn("flex size-11 cursor-default flex-col items-center justify-center rounded-lg text-xs ring-1 ring-inset", s.cell)}
                      aria-label={`${formatDate(d.attendanceDate)}: ${s.label}${d.remarks ? `, ${d.remarks}` : ""}`}
                    >
                      <span className="font-semibold tabular-nums">{Number(d.bsDate.slice(8))}</span>
                      <span className="text-[10px] font-medium opacity-80">{s.short}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {s.label} · {formatDate(d.attendanceDate)} ({d.bsDate} BS){d.remarks ? ` · ${d.remarks}` : ""}
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          {Object.values(STATUS).map((s) => (
            <span key={s.short} className="inline-flex items-center gap-1.5">
              <span className={cn("inline-flex size-4 items-center justify-center rounded text-[10px] font-semibold ring-1 ring-inset", s.cell)}>{s.short}</span>
              {s.label}
            </span>
          ))}
        </p>
      </Card>
    </div>
  );
};

export default AttendanceView;
