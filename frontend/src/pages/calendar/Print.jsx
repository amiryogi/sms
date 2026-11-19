import React, { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CalendarRange } from "lucide-react";
import { Card, EmptyState, LoadingBlock, PageShell } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useDatePrefs } from "../../hooks/useDatePrefs";
import { formatDateTime, fullName, todayAd } from "../../utils/format";
import { bsMonthRange, bsYearRange, diffDays, todayBs, MIN_BS_YEAR, MAX_BS_YEAR } from "../../lib/calendar/bsDateAdapter";
import { digits, formatAd, formatAdAsBs, weekdayName, weekdayNameOf } from "../../lib/calendar/dateFormatter";
import { itemsByDay, monthGrid, viewRange, viewSubtitle, viewTitle, weekdayOrder } from "../../lib/calendar/calendarUtils";
import { categoryMeta } from "../../lib/calendar/calendarConstants";
import { cn } from "../../lib/cn";
import PrintToolbar from "../../components/finance/print/PrintToolbar";
import { SchoolHeading } from "../../components/finance/print/SlipParts";
import { useCalendarFeed } from "../../components/calendar/useCalendarFeed";
import MiniMonth from "../../components/calendar/MiniMonth";
import { itemTimeText } from "../../components/calendar/calendarItems";

/*
 * A4 printouts of the school calendar (/calendar/print/:kind):
 *   month     one month as a grid, landscape    ?mode=bs&year=2083&month=7
 *   year      the B.S. year at a glance          ?year=2083
 *   holidays  the holiday list of a B.S. year    ?year=2083
 *   exams     the examination calendar           ?year=2083
 *   events    school events of a B.S. year       ?year=2083
 * ?print=1 opens the print dialog once the page is ready. Each person prints
 * what they are allowed to see: the data is the same feed as the screen.
 */

const KINDS = {
  month: { title: "Monthly calendar", sources: null, landscape: true },
  year: { title: "Academic calendar", sources: ["event", "exam", "academicYear"], landscape: false },
  holidays: { title: "List of holidays", sources: ["event"], landscape: false },
  exams: { title: "Examination calendar", sources: ["exam"], landscape: false },
  events: { title: "School events", sources: ["event"], landscape: false },
};

const readInt = (value, min, max, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

/** Both calendars for a day or a range, for a table cell. */
const BothDates = ({ item, prefs }) => {
  const fmt = { language: prefs.language, numerals: prefs.numerals };
  const range = (f) => (item.startDate === item.endDate ? f(item.startDate) : `${f(item.startDate)} to ${f(item.endDate)}`);
  return (
    <>
      <span className="font-semibold">{range((d) => formatAdAsBs(d, fmt))}</span>
      <span className="block text-slate-600">{range((d) => formatAd(d, fmt))}</span>
    </>
  );
};

const ListTable = ({ items, prefs, columns }) => (
  <table className="mt-3 w-full border-collapse">
    <thead>
      <tr className="border-b-2 border-slate-700 text-left text-[7.5pt] uppercase">
        <th className="w-6 py-1 pr-1 font-semibold">#</th>
        <th className="py-1 pr-2 font-semibold">Date (B.S. / A.D.)</th>
        <th className="py-1 pr-2 font-semibold">Day</th>
        <th className="py-1 pr-2 font-semibold">{columns.name}</th>
        <th className="py-1 font-semibold">{columns.last}</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item, i) => {
        const days = diffDays(item.startDate, item.endDate) + 1;
        return (
          <tr key={item.key} className="border-b border-slate-300 align-top">
            <td className="py-1 pr-1 tabular-nums">{digits(i + 1, prefs.numerals)}</td>
            <td className="py-1 pr-2 whitespace-nowrap"><BothDates item={item} prefs={prefs} /></td>
            <td className="py-1 pr-2 whitespace-nowrap">
              {weekdayNameOf(item.startDate, prefs.language)}
              {days > 1 && <span className="block text-slate-600">{digits(days, prefs.numerals)} days</span>}
            </td>
            <td className="py-1 pr-2">
              <span className="font-semibold">{item.title}</span>
              {columns.sub?.(item) && <span className="block text-slate-600">{columns.sub(item)}</span>}
            </td>
            <td className="py-1">{columns.lastValue(item)}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const CalendarPrint = () => {
  const { kind } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const prefs = useDatePrefs();
  const spec = KINDS[kind];
  const fmt = { language: prefs.language, numerals: prefs.numerals };

  const mode = params.get("mode") === "ad" ? "ad" : "bs";
  const now = todayBs();
  const year = mode === "ad" && kind === "month" ? readInt(params.get("year"), 1918, 2044, Number(todayAd().slice(0, 4))) : readInt(params.get("year"), MIN_BS_YEAR, MAX_BS_YEAR, now?.year || 2083);
  const month = readInt(params.get("month"), 1, 12, mode === "ad" ? Number(todayAd().slice(5, 7)) : now?.month || 1);

  const view = useMemo(() => ({ mode, year, month }), [mode, year, month]);
  const weeks = useMemo(() => (kind === "month" ? monthGrid(view, prefs.weekStartsOn) : []), [kind, view, prefs.weekStartsOn]);
  const range = useMemo(() => {
    if (!spec) return null;
    if (kind === "month") {
      const cells = weeks.flat().filter(Boolean);
      return cells.length ? { from: cells[0].ad, to: cells[cells.length - 1].ad } : null;
    }
    return bsYearRange(year);
  }, [spec, kind, weeks, year]);

  const { items, loading, error } = useCalendarFeed(range?.from, range?.to, spec?.sources || undefined);

  if (!spec || !range) {
    return <Card><EmptyState icon={CalendarRange} title="Nothing to print" description="This calendar printout does not exist, or the year is outside the supported range." /></Card>;
  }
  if (error) return <Card><EmptyState icon={CalendarRange} title="Calendar not available" description={error} /></Card>;

  const byDay = itemsByDay(kind === "year" ? items.filter((i) => i.source !== "examSubject") : items, range.from, range.to);
  const holidays = items.filter((i) => i.isHoliday);
  const exams = items.filter((i) => i.source === "exam");
  const events = items.filter((i) => i.source === "event" && !i.isHoliday);
  const yearLabel = `${digits(year, prefs.numerals)} B.S.`;
  const monthItems = kind === "month" ? items.filter((i) => i.endDate >= viewRange(view).from && i.startDate <= viewRange(view).to) : [];

  const heading =
    kind === "month" ? `${viewTitle(view, fmt)} (${viewSubtitle(view, fmt)})` : kind === "year" ? `${spec.title} ${yearLabel}` : `${spec.title}, ${yearLabel}`;
  const pageRule = `@media print { @page { size: A4 ${spec.landscape ? "landscape" : "portrait"}; margin: 9mm; } .calendar-sheet thead { display: table-header-group; } .calendar-sheet tr { break-inside: avoid; } }`;

  return (
    // PageShell is screen chrome only: the toolbar is print:hidden and the sheet
    // is the last child, so the shell's spacing never reaches the printed page.
    <PageShell>
      <PrintToolbar ready={!loading} autoPrint={params.get("print") === "1"} printLabel="Print" />
      {loading ? (
        <LoadingBlock text="Preparing the calendar…" />
      ) : (
        <article
          data-testid="calendar-sheet"
          className={cn(
            "calendar-sheet mx-auto w-full bg-white p-8 text-[8.5pt] leading-snug text-slate-900 shadow-card print:max-w-none print:p-0 print:shadow-none",
            spec.landscape ? "max-w-[277mm]" : "max-w-[190mm]",
          )}
        >
          <style>{pageRule}</style>
          <SchoolHeading school={user?.school} title={heading} compact={spec.landscape} />

          {kind === "month" && (
            <>
              <table className="mt-2 w-full table-fixed border-collapse">
                <thead>
                  <tr>
                    {weekdayOrder(prefs.weekStartsOn).map((w) => (
                      <th key={w} className={cn("border border-slate-500 bg-slate-100 py-1 text-[8pt] font-semibold", prefs.weeklyHolidayDays.includes(w) && "text-red-700")}>
                        {weekdayName(w, prefs.language)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, wi) => (
                    <tr key={wi}>
                      {week.map((cell, ci) => {
                        if (!cell || !cell.inMonth) return <td key={ci} className="border border-slate-400 bg-slate-50" />;
                        const list = byDay.get(cell.ad) || [];
                        const red = list.some((i) => i.isHoliday) || prefs.weeklyHolidayDays.includes(cell.weekday);
                        return (
                          // Same layout as the screen: the day number large in the middle, the
                          // other calendar's number in the lower right corner.
                          <td key={cell.ad} className={cn("relative border border-slate-500 p-1 pb-[3.5mm] align-top", weeks.length > 5 ? "h-[23mm]" : "h-[27mm]", red && "bg-red-50")}>
                            <div className="flex flex-col items-center">
                              <span className={cn("text-[20pt] leading-none font-bold", red && "text-red-700")}>{digits(cell.label, prefs.numerals)}</span>
                              <ul className="mt-0.5 w-full space-y-px text-[6.5pt] leading-tight">
                                {list.slice(0, 3).map((item) => (
                                  <li key={item.key} className={cn("truncate", item.isHoliday && "font-semibold text-red-700")}>{item.title}</li>
                                ))}
                                {list.length > 3 && <li className="text-slate-600">+{list.length - 3} more</li>}
                              </ul>
                            </div>
                            <span className="absolute right-[1.2mm] bottom-[0.8mm] text-[9pt] leading-none font-medium text-slate-600">
                              {cell.altLabel === null ? "" : digits(cell.altLabel, mode === "bs" ? "en" : prefs.numerals)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-[7pt] text-slate-600">
                Large numbers: {mode === "bs" ? "B.S." : "A.D."} · small numbers, lower right: {mode === "bs" ? "A.D." : "B.S."} · red: holiday or weekly holiday · {digits(monthItems.length, prefs.numerals)} item{monthItems.length === 1 ? "" : "s"} this month
              </p>
            </>
          )}

          {kind === "year" && (
            <>
              <div className="mt-3 grid grid-cols-4 gap-x-4 gap-y-3">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <MiniMonth key={m} view={{ mode: "bs", year, month: m }} byDay={byDay} prefs={prefs} print />
                ))}
              </div>
              <p className="mt-2 text-[7pt] text-slate-600">Red: holiday or weekly holiday · shaded: holiday · dot: exam or event</p>
              {[
                ["Holidays", holidays],
                ["Examinations", exams],
                ["Events", events],
              ].map(
                ([label, list]) =>
                  list.length > 0 && (
                    <section key={label} className="mt-3">
                      <h3 className="border-b border-slate-600 text-[9pt] font-bold uppercase">{label}</h3>
                      <ul className="mt-1 columns-2 gap-6 text-[7.5pt]">
                        {list.map((item) => (
                          <li key={item.key} className="break-inside-avoid py-px">
                            <span className="font-semibold">
                              {formatAdAsBs(item.startDate, fmt)}
                              {item.endDate !== item.startDate ? ` to ${formatAdAsBs(item.endDate, fmt)}` : ""}
                            </span>{" "}
                            {item.title}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ),
              )}
            </>
          )}

          {kind === "holidays" &&
            (holidays.length === 0 ? (
              <p className="mt-6 text-center">No holidays on the calendar for {yearLabel}.</p>
            ) : (
              <ListTable
                items={holidays}
                prefs={prefs}
                columns={{ name: "Holiday", last: "Applies to", sub: (i) => categoryMeta(i.category).label, lastValue: (i) => i.applicability || (i.audience === "Everyone" ? "Whole school" : i.audience) }}
              />
            ))}

          {kind === "exams" &&
            (exams.length === 0 ? (
              <p className="mt-6 text-center">No examinations dated in {yearLabel}.</p>
            ) : (
              <ListTable
                items={exams}
                prefs={prefs}
                columns={{
                  name: "Examination",
                  last: "Papers",
                  sub: () => null,
                  lastValue: (exam) => {
                    const papers = items.filter((p) => p.source === "examSubject" && p.sourceId === exam.sourceId);
                    return papers.length ? `${digits(papers.length, prefs.numerals)} dated` : "";
                  },
                }}
              />
            ))}

          {kind === "events" &&
            (events.length === 0 ? (
              <p className="mt-6 text-center">No events on the calendar for {yearLabel}.</p>
            ) : (
              <ListTable
                items={events}
                prefs={prefs}
                columns={{ name: "Event", last: "For", sub: (i) => `${categoryMeta(i.category).label} · ${itemTimeText(i, prefs.numerals)}`, lastValue: (i) => i.audience }}
              />
            ))}

          <p className="mt-3 text-[7pt] text-slate-600">
            Printed {formatDateTime(new Date())}
            {user ? ` by ${fullName(user)}` : ""}
            {kind !== "month" && range ? ` · ${yearLabel} = ${formatAd(bsMonthRange(year, 1).from)} to ${formatAd(range.to)}` : ""}
          </p>
        </article>
      )}
    </PageShell>
  );
};

export default CalendarPrint;
