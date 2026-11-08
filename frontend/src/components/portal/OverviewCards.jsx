import React from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Award, Wallet, NotebookPen, CalendarClock, BookOpen, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, Badge } from "../ui";
import { Progress } from "../shadcn/progress";
import { formatCurrency, formatDate, formatRelative } from "../../utils/format";

/*
 * Dashboard cards built from GET /portal/students/:id/overview. Shared by the
 * student and parent portals; `base` is the portal's path prefix
 * ("/student" or "/parent") and `query` keeps a parent's chosen child.
 */

const Tile = ({ icon, label, to, children }) => {
  const Icon = icon;
  return (
    <Link to={to} className="group block rounded-card border border-slate-200/80 bg-white p-5 shadow-card transition-colors hover:border-brand-200 focus-visible:outline-2 focus-visible:outline-brand-600">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-brand-50 group-hover:text-brand-700">
          <Icon size={16} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-2">{children}</div>
    </Link>
  );
};

export const SummaryTiles = ({ overview, base, query = "" }) => {
  const { attendance, latestResult, fees, assignments } = overview;
  const pct = attendance?.percentage ?? 0;
  const pending = assignments.filter((a) => !a.submitted);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Tile icon={CalendarCheck} label="Attendance" to={`${base}/attendance${query}`}>
        {attendance?.total ? (
          <>
            <p className="text-2xl font-semibold text-slate-900 tabular-nums">{Number(pct).toFixed(1)}%</p>
            <Progress value={pct} className="mt-2 h-1.5" aria-label={`Attendance ${pct}%`} />
            <p className="mt-1.5 text-xs text-slate-500">
              {attendance.attended} of {attendance.total} days
              {attendance.lastMarked ? ` · last ${formatRelative(attendance.lastMarked)}` : ""}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500">No register taken yet</p>
        )}
      </Tile>
      <Tile icon={Award} label="Latest result" to={`${base}/results${query}`}>
        {latestResult ? (
          <>
            <p className="text-2xl font-semibold text-slate-900">
              {latestResult.overallGrade || "—"}
              {latestResult.percentage !== null && <span className="ml-2 text-base font-medium text-slate-500 tabular-nums">{latestResult.percentage.toFixed(1)}%</span>}
            </p>
            <p className="mt-1.5 truncate text-xs text-slate-500">
              {latestResult.examName}
              {latestResult.classRank ? ` · rank ${latestResult.classRank}` : ""}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500">No published results yet</p>
        )}
      </Tile>
      <Tile icon={Wallet} label="Fees" to={`${base}/fees${query}`}>
        {fees && fees.amount > 0 ? (
          fees.balance > 0 ? (
            <>
              <p className="text-2xl font-semibold text-slate-900 tabular-nums">{formatCurrency(fees.balance)}</p>
              <p className={`mt-1.5 text-xs ${fees.overdue > 0 ? "font-medium text-red-600" : "text-slate-500"}`}>
                {fees.overdue > 0
                  ? `${formatCurrency(fees.overdue)} overdue`
                  : fees.nextDue?.dueDate
                    ? `Next due ${formatDate(fees.nextDue.dueDate)}`
                    : "Balance for this year"}
              </p>
            </>
          ) : (
            <p className="flex items-center gap-1.5 text-lg font-semibold text-emerald-700">
              <CheckCircle2 size={18} aria-hidden="true" /> All paid
            </p>
          )
        ) : (
          <p className="text-sm text-slate-500">No fees set yet</p>
        )}
      </Tile>
      <Tile icon={NotebookPen} label="Assignments" to={`${base}/assignments${query}`}>
        <p className="text-2xl font-semibold text-slate-900 tabular-nums">{pending.length}</p>
        <p className="mt-1.5 text-xs text-slate-500">
          {pending.length === 0 ? "Nothing due" : pending[0] ? `Next: ${pending[0].title} · ${formatDate(pending[0].dueDate)}` : ""}
        </p>
      </Tile>
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
              <span className="text-[10px] font-semibold uppercase">{e.startDate ? new Date(e.startDate).toLocaleDateString("en-GB", { month: "short" }) : "—"}</span>
              <span className="text-lg leading-none font-bold tabular-nums">{e.startDate ? new Date(e.startDate).getDate() : "?"}</span>
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
