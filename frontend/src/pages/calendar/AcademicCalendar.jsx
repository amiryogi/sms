import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Printer } from "lucide-react";
import { Alert, Card, CardHeader, PageHeader, PageShell, SelectInput, StatCard, StatGroup, buttonClasses } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useDatePrefs } from "../../hooks/useDatePrefs";
import { todayAd } from "../../utils/format";
import { digits } from "../../lib/calendar/dateFormatter";
import { itemsByDay } from "../../lib/calendar/calendarUtils";
import { useCalendarFeed } from "../../components/calendar/useCalendarFeed";
import { useBsYear } from "../../components/calendar/useBsYear";
import MiniMonth from "../../components/calendar/MiniMonth";
import { ItemRow } from "../../components/calendar/CalendarParts";

// The year view leaves out notices and day-to-day deadlines: it is the plan of the year.
const SOURCES = ["event", "exam", "academicYear"];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Calendar -> Academic calendar: the B.S. year at a glance, with its holidays, exams and events. */
const AcademicCalendar = () => {
  const { hasRole } = useAuth();
  const prefs = useDatePrefs();
  const { year, setYear, range, years } = useBsYear();
  const { items, loading, error } = useCalendarFeed(range?.from, range?.to, SOURCES);
  const [picked, setPicked] = useState(null);
  const today = todayAd();

  const yearItems = useMemo(() => items.filter((i) => i.source !== "examSubject"), [items]);
  const byDay = useMemo(() => (range ? itemsByDay(yearItems, range.from, range.to) : new Map()), [yearItems, range]);
  const holidays = yearItems.filter((i) => i.isHoliday);
  const exams = yearItems.filter((i) => i.source === "exam");
  const events = yearItems.filter((i) => !i.isHoliday && i.source !== "exam");
  const holidayDays = [...byDay.entries()].filter(([, list]) => list.some((i) => i.isHoliday)).length;
  const pickedItems = picked ? byDay.get(picked) || [] : [];

  return (
    <PageShell>
      <PageHeader
        title="Academic calendar"
        description="The whole year: holidays in red, a dot where something else is on."
        actions={
          <>
            <div className="w-36">
              <SelectInput aria-label="B.S. year" value={year} onChange={(e) => setYear(e.target.value)}>
                {years.map((y) => (
                  <option key={y} value={y}>{digits(y, prefs.numerals)} B.S.</option>
                ))}
              </SelectInput>
            </div>
            <Link to={`/calendar/print/year?year=${year}`} className={buttonClasses({ variant: "secondary" })}>
              <Printer size={16} aria-hidden="true" />
              Print year
            </Link>
          </>
        }
      />
      {error && <Alert tone="danger">{error}</Alert>}

      <StatGroup columns={4}>
        {[
          ["Holidays", holidays.length],
          ["Days closed", holidayDays],
          ["Exams", exams.length],
          ["Events", events.length],
        ].map(([label, value]) => (
          <StatCard key={label} label={label} value={digits(value, prefs.numerals)} loading={loading} />
        ))}
      </StatGroup>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        {/* While a year loads the months show without dots; the figures above show skeletons. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy={loading}>
          {MONTHS.map((month) => (
            <MiniMonth key={month} view={{ mode: "bs", year, month }} byDay={byDay} prefs={prefs} today={today} onSelect={setPicked} />
          ))}
        </div>

        <div className="space-y-4">
          {picked && (
            <Card>
              <CardHeader title="On this day" />
              {pickedItems.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing on this day.</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {pickedItems.map((item) => (
                    <ItemRow key={item.key} item={item} prefs={prefs} hasRole={hasRole} showDate />
                  ))}
                </ul>
              )}
            </Card>
          )}
          <Card>
            <CardHeader title={`Holidays in ${digits(year, prefs.numerals)}`} />
            {holidays.length === 0 ? (
              <p className="text-sm text-slate-500">
                No holidays on the calendar for this year.
                {hasRole("ADMIN") && (
                  <>
                    {" "}
                    <Link to="/calendar/holidays" className="font-medium text-brand-700 hover:underline">Add or import them</Link>.
                  </>
                )}
              </p>
            ) : (
              <ul className="max-h-128 divide-y divide-slate-200 overflow-y-auto">
                {holidays.map((item) => (
                  <ItemRow key={item.key} item={item} prefs={prefs} showDate />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
};

export default AcademicCalendar;
