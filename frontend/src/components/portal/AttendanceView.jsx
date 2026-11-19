import React, { useEffect, useMemo, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { attendanceService } from "../../api/attendanceService";
import { Card, CardHeader, Tabs, EmptyState, LoadingBlock, StatCard, StatGroup } from "../ui";
import { Tooltip, TooltipTrigger, TooltipContent } from "../shadcn/tooltip";
import { cn } from "../../lib/cn";
import { formatDate } from "../../utils/format";

/*
 * Like a paper register, only the exceptions are coloured: late warn, absent
 * risk. Present is the expected state of almost every day, so it stays quiet;
 * excused is not a status colour. Every day also shows its letter, so colour is
 * never the only carrier of the mark.
 */
const STATUS = {
  present: { short: "P", label: "Present", cell: "bg-white text-slate-700 ring-slate-200" },
  late: { short: "L", label: "Late", tone: "warn", cell: "bg-warn-surface text-warn ring-warn-line" },
  absent: { short: "A", label: "Absent", tone: "risk", cell: "bg-risk-surface text-risk ring-risk-line" },
  excused: { short: "E", label: "Excused", cell: "bg-slate-100 text-slate-700 ring-slate-200" },
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
    return <Card><EmptyState icon={CalendarCheck} title="No attendance yet" description="This is the school register for the year. Days appear here once teachers start taking it." /></Card>;
  }

  return (
    <div className="space-y-6">
      {/* The year's rate is the headline; the day counts sit ruled beneath it. The
          bar is ink: the server sends no attendance threshold, and the frontend
          does not invent one. Late and absent counts take their status colour. */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-5">
          <StatCard
            surface="plain"
            label="Attendance this year"
            value={`${pct.toFixed(1)}%`}
            progress={pct}
            progressLabel={`Attendance ${pct.toFixed(1)}%`}
            sub={`${summary.attended} of ${summary.total} school days${summary.countLateAsPresent ? " (late counts as present)" : ""}`}
          />
        </div>
        <StatGroup columns={4} surface="well" size="sm" className="border-t border-slate-200">
          {Object.entries(STATUS).map(([key, s]) => (
            <StatCard key={key} label={s.label} value={summary[key] || 0} tone={s.tone && summary[key] > 0 ? s.tone : "ink"} />
          ))}
        </StatGroup>
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
            {selectedMeta.attended} of {selectedMeta.total} days, <span className="font-semibold text-slate-900 tabular-nums">{selectedMeta.percentage}%</span>
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
                      <span className="text-2xs font-medium">{s.short}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {s.label}, {formatDate(d.attendanceDate)} ({d.bsDate} BS){d.remarks ? `. ${d.remarks}` : ""}
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          {Object.values(STATUS).map((s) => (
            <span key={s.short} className="inline-flex items-center gap-1.5">
              <span className={cn("inline-flex size-4 items-center justify-center rounded-sm text-2xs font-semibold ring-1 ring-inset", s.cell)}>{s.short}</span>
              {s.label}
            </span>
          ))}
        </p>
      </Card>
    </div>
  );
};

export default AttendanceView;
