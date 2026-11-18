import React from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Award, Wallet, NotebookPen, CalendarClock, BookOpen, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, Badge, StatCard } from "../ui";
import { formatCurrency, formatDate, formatRelative, dayParts } from "../../utils/format";

/*
 * Dashboard cards built from GET /portal/students/:id/overview. Shared by the
 * student and parent portals; `base` is the portal's path prefix
 * ("/student" or "/parent") and `query` keeps a parent's chosen child.
 */

/** Quiet text in place of a figure, when there is nothing to show yet. */
const Nothing = ({ children }) => <p className="mt-3 text-sm text-slate-500">{children}</p>;

export const SummaryTiles = ({ overview, base, query = "" }) => {
  const { attendance, latestResult, fees, assignments } = overview;
  const pct = attendance?.percentage ?? 0;
  const pending = assignments.filter((a) => !a.submitted);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={CalendarCheck}
        label="Attendance"
        to={`${base}/attendance${query}`}
        value={`${Number(pct).toFixed(1)}%`}
        progress={attendance?.total ? pct : undefined}
        progressLabel={`Attendance ${Number(pct).toFixed(1)}%`}
        sub={
          attendance?.total
            ? `${attendance.attended} of ${attendance.total} days${attendance.lastMarked ? `, last marked ${formatRelative(attendance.lastMarked)}` : ""}`
            : null
        }
      >
        {attendance?.total ? undefined : <Nothing>No register taken yet</Nothing>}
      </StatCard>
      <StatCard
        icon={Award}
        label="Latest result"
        to={`${base}/results${query}`}
        value={latestResult ? latestResult.overallGrade || "—" : undefined}
        sub={
          latestResult && (
            <span className="block truncate">
              {latestResult.percentage !== null && <span className="tabular-nums">{latestResult.percentage.toFixed(1)}% in </span>}
              {latestResult.examName}
              {latestResult.classRank ? `, rank ${latestResult.classRank}` : ""}
            </span>
          )
        }
      >
        {latestResult ? undefined : <Nothing>No published results yet</Nothing>}
      </StatCard>
      <StatCard
        icon={Wallet}
        label="Fees"
        to={`${base}/fees${query}`}
        value={fees?.balance > 0 ? formatCurrency(fees.balance) : undefined}
        sub={
          fees?.amount > 0 && fees.balance > 0 ? (
            fees.overdue > 0 ? (
              <span className="font-medium text-risk">{formatCurrency(fees.overdue)} overdue</span>
            ) : fees.nextDue?.dueDate ? (
              `Next due ${formatDate(fees.nextDue.dueDate)}`
            ) : (
              "Balance for this year"
            )
          ) : null
        }
      >
        {!(fees && fees.amount > 0) ? (
          <Nothing>No fees set yet</Nothing>
        ) : fees.balance > 0 ? undefined : (
          // Settled is a status, so it carries the ok colour and an icon.
          <p className="mt-3 flex items-center gap-1.5 text-lg font-semibold text-ok">
            <CheckCircle2 size={18} aria-hidden="true" /> All paid
          </p>
        )}
      </StatCard>
      <StatCard
        icon={NotebookPen}
        label="Assignments due"
        to={`${base}/assignments${query}`}
        value={pending.length}
        sub={pending.length === 0 ? "Nothing due" : <span className="block truncate">Next: {pending[0].title}, {formatDate(pending[0].dueDate)}</span>}
      />
    </div>
  );
};

export const UpcomingExamsCard = ({ exams }) => (
  <Card>
    <CardHeader icon={CalendarClock} title="Upcoming exams" />
    {exams.length === 0 ? (
      <p className="text-sm text-slate-500">No exams scheduled.</p>
    ) : (
      <ul className="space-y-3">
        {exams.map((e) => (
          <li key={e.id} className="flex items-center gap-3">
            <span className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-brand-50 py-1 text-brand-700">
              <span className="text-[10px] font-semibold uppercase">{dayParts(e.startDate)?.monthShort ?? "—"}</span>
              <span className="text-lg leading-none font-bold tabular-nums">{dayParts(e.startDate)?.day ?? "?"}</span>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{e.name}</p>
              <p className="text-xs text-slate-500">
                {e.startDate ? `${formatDate(e.startDate)}${e.endDate ? ` – ${formatDate(e.endDate)}` : ""}` : "Dates to be announced"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    )}
  </Card>
);

export const AssignmentsDueCard = ({ assignments, to }) => (
  <Card>
    <CardHeader
      icon={NotebookPen}
      title="Assignments due"
      actions={
        <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
          All <ArrowRight size={14} aria-hidden="true" />
        </Link>
      }
    />
    {assignments.length === 0 ? (
      <p className="text-sm text-slate-500">Nothing due right now.</p>
    ) : (
      <ul className="divide-y divide-slate-100">
        {assignments.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{a.title}</p>
              <p className="text-xs text-slate-500">{a.subject} · due {formatDate(a.dueDate)}</p>
            </div>
            {a.submitted ? <Badge tone="success" dot>Submitted</Badge> : <Badge tone="warning" dot>To do</Badge>}
          </li>
        ))}
      </ul>
    )}
  </Card>
);

export const SubjectsCard = ({ subjects }) => (
  <Card>
    <CardHeader icon={BookOpen} title="Subjects" description={`${subjects.length} this year`} />
    <ul className="grid gap-2 sm:grid-cols-2">
      {subjects.map((s) => (
        <li key={s.id} className="rounded-xl border border-slate-100 px-3 py-2.5">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
            {s.name}
            {s.hasPractical && <span className="rounded bg-slate-100 px-1.5 text-[10px] font-medium text-slate-600">+ practical</span>}
          </p>
          <p className="text-xs text-slate-500">
            {s.code} · {s.teacher || "Teacher not assigned"}
          </p>
        </li>
      ))}
    </ul>
  </Card>
);
