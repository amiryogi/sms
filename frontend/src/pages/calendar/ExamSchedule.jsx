import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Printer } from "lucide-react";
import { Alert, Badge, Card, EmptyState, LoadingBlock, PageHeader, SelectInput, buttonClasses } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useDatePrefs } from "../../hooks/useDatePrefs";
import { todayAd } from "../../utils/format";
import { digits, weekdayNameOf } from "../../lib/calendar/dateFormatter";
import { diffDays } from "../../lib/calendar/bsDateAdapter";
import { useCalendarFeed } from "../../components/calendar/useCalendarFeed";
import { useBsYear } from "../../components/calendar/useBsYear";
import { itemDateText, itemSecondaryDateText, itemTimeText } from "../../components/calendar/calendarItems";

const SOURCES = ["exam"];

/**
 * Calendar -> Examination Schedule. Read straight from the exams module: an
 * exam is changed on the Exams page, never here.
 */
const ExamSchedule = () => {
  const { hasRole } = useAuth();
  const prefs = useDatePrefs();
  const { year, setYear, range, years } = useBsYear();
  const { items, loading, error } = useCalendarFeed(range?.from, range?.to, SOURCES);
  const today = todayAd();

  const exams = useMemo(() => items.filter((i) => i.source === "exam"), [items]);
  const papers = useMemo(() => {
    const map = new Map();
    for (const i of items.filter((x) => x.source === "examSubject")) {
      if (!map.has(i.sourceId)) map.set(i.sourceId, []);
      map.get(i.sourceId).push(i);
    }
    return map;
  }, [items]);

  const stateOf = (exam) => {
    if (exam.endDate < today) return <Badge tone="neutral">Finished</Badge>;
    if (exam.startDate <= today) return <Badge tone="success" dot>Under way</Badge>;
    const days = diffDays(today, exam.startDate);
    return <Badge tone="info">In {digits(days, prefs.numerals)} day{days === 1 ? "" : "s"}</Badge>;
  };

  return (
    <div>
      <PageHeader
        title="Examination Schedule"
        description="Exam dates for the year, from the exams set up by the school."
        icon={ClipboardList}
        actions={
          <>
            <div className="w-36">
              <SelectInput aria-label="B.S. year" value={year} onChange={(e) => setYear(e.target.value)}>
                {years.map((y) => (
                  <option key={y} value={y}>{digits(y, prefs.numerals)} B.S.</option>
                ))}
              </SelectInput>
            </div>
            <Link to={`/calendar/print/exams?year=${year}`} className={buttonClasses({ variant: "secondary" })}>
              <Printer size={16} aria-hidden="true" />
              Print
            </Link>
          </>
        }
      />
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <LoadingBlock text="Loading exams…" />
        ) : exams.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={`No exams dated in ${year}`}
            description={hasRole("ADMIN") ? "Give an exam its start and end dates on the Exams page and it appears here." : "The school has not published exam dates for this year yet."}
            action={hasRole("ADMIN") ? <Link to="/admin/exams" className={buttonClasses({ variant: "outline" })}>Open Exams</Link> : undefined}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {exams.map((exam) => (
              <li key={exam.key} className="grid gap-x-6 gap-y-2 px-5 py-4 sm:grid-cols-[15rem_1fr_auto]" data-testid="exam-row">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{itemDateText(exam, prefs)}</p>
                  <p className="text-xs text-slate-500">{itemSecondaryDateText(exam, prefs)}</p>
                  <p className="text-xs text-slate-500">
                    {weekdayNameOf(exam.startDate, prefs.language)}
                    {exam.endDate !== exam.startDate ? ` to ${weekdayNameOf(exam.endDate, prefs.language)}` : ""}
                    {` · ${digits(diffDays(exam.startDate, exam.endDate) + 1, prefs.numerals)} day${exam.startDate === exam.endDate ? "" : "s"}`}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {exam.title}
                    {exam.status === "DRAFT" && <Badge tone="warning" className="ml-2">Draft: only administrators see it</Badge>}
                  </p>
                  {(papers.get(exam.sourceId) || []).length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                      {papers.get(exam.sourceId).map((p) => (
                        <li key={p.key}>
                          <span className="font-medium text-slate-800">{itemDateText(p, prefs)}</span> · {p.title.replace(`${exam.title}: `, "")}
                          {p.detail ? ` (${p.detail})` : ""}
                          {!p.isAllDay ? ` · ${itemTimeText(p, prefs.numerals)}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>{stateOf(exam)}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default ExamSchedule;
