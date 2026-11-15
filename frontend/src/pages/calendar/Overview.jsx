import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, List, Plus, Printer, Rows3, Sun } from "lucide-react";
import { Alert, Button, Card, CardHeader, IconButton, LoadingBlock, PageHeader, Tabs, buttonClasses } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useDatePrefs } from "../../hooks/useDatePrefs";
import { calendarService } from "../../api/calendarService";
import { todayAd, formatDate } from "../../utils/format";
import { addDays, adToBs } from "../../lib/calendar/bsDateAdapter";
import { formatBs, formatAd, weekdayNameOf } from "../../lib/calendar/dateFormatter";
import { itemsByDay, monthGrid, shiftView, switchViewMode, viewOf, viewRange, viewSubtitle, viewTitle, weekOf } from "../../lib/calendar/calendarUtils";
import { cn } from "../../lib/cn";
import { useCalendarFeed } from "../../components/calendar/useCalendarFeed";
import { AgendaView, MonthView, WeekView } from "../../components/calendar/CalendarViews";
import { ItemRow, Legend } from "../../components/calendar/CalendarParts";
import EventDialog from "../../components/calendar/EventDialog";
import EventDetailDialog from "../../components/calendar/EventDetailDialog";

const VIEW_TABS = [
  { value: "month", label: "Month", icon: CalendarDays },
  { value: "week", label: "Week", icon: Rows3 },
  { value: "agenda", label: "List", icon: List },
];

const UpcomingList = ({ title, icon, items, prefs, hasRole, empty, onOpen }) => (
  <Card>
    <CardHeader title={title} icon={icon} />
    {items.length === 0 ? (
      <p className="text-sm text-slate-500">{empty}</p>
    ) : (
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <ItemRow key={item.key} item={item} prefs={prefs} hasRole={hasRole} showDate onOpen={onOpen} />
        ))}
      </ul>
    )}
  </Card>
);

/**
 * Calendar overview: today in both calendars, what is coming, and the month,
 * week or list view of everything this person may see.
 */
const CalendarOverview = () => {
  const { hasRole } = useAuth();
  const prefs = useDatePrefs();
  const today = todayAd();
  const canAdd = hasRole("ADMIN") || hasRole("TEACHER");

  const [mode, setMode] = useState(prefs.calendar === "ad" ? "ad" : "bs");
  const [layout, setLayout] = useState("month");
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState(() => viewOf(today, prefs.calendar === "ad" ? "ad" : "bs"));
  const [overview, setOverview] = useState(null);
  const [dialog, setDialog] = useState(null); // { event } to add or edit
  const [detail, setDetail] = useState(null); // feed item being read

  const weeks = useMemo(() => monthGrid(view, prefs.weekStartsOn), [view, prefs.weekStartsOn]);
  const weekDays = useMemo(() => weekOf(selected, prefs.weekStartsOn, mode), [selected, prefs.weekStartsOn, mode]);
  const monthRange = viewRange(view);

  // What to load: the whole grid in month view (so the padding days are filled too).
  const [from, to] = useMemo(() => {
    if (layout === "week") {
      const days = weekDays.filter(Boolean);
      return [days[0].ad, days[days.length - 1].ad];
    }
    if (layout === "agenda") return [monthRange.from, monthRange.to];
    const cells = weeks.flat().filter(Boolean);
    return [cells[0].ad, cells[cells.length - 1].ad];
  }, [layout, weekDays, weeks, monthRange.from, monthRange.to]);

  const { items, loading, error, reload } = useCalendarFeed(from, to);
  const byDay = useMemo(() => itemsByDay(items, from, to), [items, from, to]);
  const agendaDays = useMemo(() => {
    const days = [];
    for (let d = from; d && d <= to; d = addDays(d, 1)) days.push(d);
    return days;
  }, [from, to]);

  const loadOverview = () =>
    calendarService
      .getOverview()
      .then((res) => setOverview(res.data))
      .catch(() => setOverview(null));
  useEffect(() => {
    loadOverview();
  }, []);

  const go = (next) => {
    if (!next) return;
    setView(next);
    const range = viewRange(next);
    if (selected < range.from || selected > range.to) setSelected(today >= range.from && today <= range.to ? today : range.from);
  };
  const select = (ad) => {
    setSelected(ad);
    const next = viewOf(ad, mode);
    if (next && (next.year !== view.year || next.month !== view.month)) setView(next);
  };
  const changeMode = (nextMode) => {
    setMode(nextMode);
    setView(viewOf(selected, nextMode) || switchViewMode(view, nextMode));
  };
  const goToday = () => {
    setSelected(today);
    setView(viewOf(today, mode));
  };
  const stepWeek = (delta) => select(addDays(selected, delta * 7));

  const afterChange = () => {
    reload();
    loadOverview();
  };

  const selectedItems = byDay.get(selected) || [];
  const selectedBs = adToBs(selected);
  const usedCategories = [...new Set(items.map((i) => i.category))];
  const fmt = { language: prefs.language, numerals: prefs.numerals };
  const todayInfo = overview?.today;
  const printHref = `/calendar/print/month?mode=${view.mode}&year=${view.year}&month=${view.month}`;

  return (
    <div>
      <PageHeader
        title="School Calendar"
        description="Holidays, exams, school events and deadlines in one place."
        icon={CalendarRange}
        actions={
          <>
            <Link to={printHref} className={buttonClasses({ variant: "secondary" })}>
              <Printer size={16} aria-hidden="true" />
              Print month
            </Link>
            {canAdd && (
              <Button icon={Plus} onClick={() => setDialog({ event: null })}>
                Add event
              </Button>
            )}
          </>
        }
      />

      {/* Today, and what is coming */}
      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <Card className="bg-brand-600 text-brand-fg lg:col-span-1" data-testid="today-card">
          <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Today</p>
          <p className="mt-1 text-2xl leading-tight font-semibold">{formatBs(adToBs(today), fmt)}</p>
          <p className="text-sm opacity-90">
            {weekdayNameOf(today, prefs.language)} · {formatAd(today, fmt)}
          </p>
          {todayInfo && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium">
              <Sun size={15} aria-hidden="true" />
              {overview.isWorkingDay ? "School day" : overview.nonWorkingReason || "Not a school day"}
            </p>
          )}
        </Card>
        {!overview ? (
          <Card className="lg:col-span-3"><LoadingBlock text="Loading what is coming…" /></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3 lg:col-span-3">
            <UpcomingList title="Upcoming holidays" items={overview.holidays.slice(0, 3)} prefs={prefs} hasRole={hasRole} empty={`No holidays in the next ${overview.windowDays} days.`} onOpen={setDetail} />
            <UpcomingList title="Upcoming exams" items={overview.exams.slice(0, 3)} prefs={prefs} hasRole={hasRole} empty="No exams scheduled." />
            <UpcomingList title="Events and deadlines" items={[...overview.events, ...overview.deadlines].sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 3)} prefs={prefs} hasRole={hasRole} empty="Nothing coming up." onOpen={setDetail} />
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <Card padding="sm" className="min-w-0 sm:p-5">
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5">
              <IconButton icon={ChevronsLeft} label="Previous year" variant="ghost" onClick={() => go(shiftView(view, -12))} disabled={!shiftView(view, -12)} />
              <IconButton
                icon={ChevronLeft}
                label={layout === "week" ? "Previous week" : "Previous month"}
                variant="ghost"
                onClick={() => (layout === "week" ? stepWeek(-1) : go(shiftView(view, -1)))}
                disabled={layout !== "week" && !shiftView(view, -1)}
              />
            </div>
            <div className="min-w-0 flex-1 text-center sm:flex-none sm:text-left">
              <h2 className="text-lg leading-tight font-semibold text-slate-900" data-testid="calendar-title">{viewTitle(view, fmt)}</h2>
              <p className="text-xs text-slate-500">{viewSubtitle(view, fmt)}</p>
            </div>
            <div className="flex items-center gap-0.5">
              <IconButton
                icon={ChevronRight}
                label={layout === "week" ? "Next week" : "Next month"}
                variant="ghost"
                onClick={() => (layout === "week" ? stepWeek(1) : go(shiftView(view, 1)))}
                disabled={layout !== "week" && !shiftView(view, 1)}
              />
              <IconButton icon={ChevronsRight} label="Next year" variant="ghost" onClick={() => go(shiftView(view, 12))} disabled={!shiftView(view, 12)} />
            </div>
            <Button variant="secondary" size="sm" onClick={goToday}>Today</Button>
            <span className="flex-1" />
            <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Calendar">
              {["bs", "ad"].map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => changeMode(m)}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-brand-600",
                    mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  {m === "bs" ? "B.S." : "A.D."}
                </button>
              ))}
            </div>
            <Tabs tabs={VIEW_TABS} value={layout} onChange={setLayout} />
          </div>

          {error && <Alert tone="danger" className="mb-3">{error}</Alert>}
          <div className={cn("transition-opacity", loading && "opacity-60")} aria-busy={loading}>
            {layout === "month" && <MonthView weeks={weeks} byDay={byDay} prefs={prefs} mode={mode} today={today} selected={selected} onSelect={select} />}
            {layout === "week" && <WeekView days={weekDays} byDay={byDay} prefs={prefs} today={today} selected={selected} onSelect={select} />}
            {layout === "agenda" && <AgendaView days={agendaDays} byDay={byDay} prefs={prefs} today={today} hasRole={hasRole} onOpen={setDetail} emptyText="Nothing on the calendar this month." />}
          </div>
          {usedCategories.length > 0 && <Legend categories={usedCategories} className="mt-4" />}
        </Card>

        {/* The chosen day */}
        <Card className="h-fit" data-testid="day-panel">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{weekdayNameOf(selected, prefs.language)}</p>
          <p className="mt-0.5 text-xl leading-tight font-semibold text-slate-900">{selectedBs ? formatBs(selectedBs, fmt) : formatAd(selected, fmt)}</p>
          <p className="text-sm text-slate-500">
            {formatAd(selected, fmt)}
            {selected === today ? " · Today" : ""}
          </p>
          {prefs.weeklyHolidayDays.includes(new Date(`${selected}T00:00:00Z`).getUTCDay()) && (
            <p className="mt-2 text-sm font-medium text-red-600">Weekly holiday</p>
          )}
          <div className="mt-3 border-t border-slate-100 pt-1">
            {selectedItems.length === 0 ? (
              <p className="py-3 text-sm text-slate-500">Nothing on this day.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {selectedItems.map((item) => (
                  <ItemRow key={item.key} item={item} prefs={prefs} hasRole={hasRole} onOpen={setDetail} />
                ))}
              </ul>
            )}
          </div>
          {canAdd && (
            <Button variant="outline" size="sm" icon={Plus} className="mt-2 w-full" onClick={() => setDialog({ event: null, date: selected })}>
              Add on {formatDate(selected)}
            </Button>
          )}
        </Card>
      </div>

      <EventDialog open={Boolean(dialog)} event={dialog?.event || null} defaultDate={dialog?.date || selected} onClose={() => setDialog(null)} onSaved={afterChange} />
      <EventDetailDialog
        eventId={detail?.sourceId || null}
        occurrence={detail ? { startDate: detail.startDate, endDate: detail.endDate } : null}
        onClose={() => setDetail(null)}
        onDeleted={afterChange}
        onEdit={(event) => {
          setDetail(null);
          setDialog({ event });
        }}
      />
    </div>
  );
};

export default CalendarOverview;
