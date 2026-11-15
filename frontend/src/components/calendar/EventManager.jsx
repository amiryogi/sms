import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Download, PartyPopper, Pencil, Plus, Printer, Search, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, IconButton, LoadingBlock, PageHeader, SelectInput, TextInput, buttonClasses, confirmDialog, toast } from "../ui";
import { calendarService } from "../../api/calendarService";
import { useAuth } from "../../context/AuthContext";
import { useDatePrefs } from "../../hooks/useDatePrefs";
import { bsYearRange, todayBs, MIN_BS_YEAR, MAX_BS_YEAR } from "../../lib/calendar/bsDateAdapter";
import { digits, weekdayNameOf } from "../../lib/calendar/dateFormatter";
import { RECURRENCE_OPTIONS, ROLE_LABELS } from "../../lib/calendar/calendarConstants";
import { CategoryChip } from "./CalendarParts";
import { itemDateText, itemSecondaryDateText, itemTimeText } from "./calendarItems";
import EventDialog from "./EventDialog";
import HolidayImportDialog from "./HolidayImportDialog";

const PAGE_SIZE = 100;

const audienceText = (event) =>
  event.audienceType === "ALL"
    ? "Everyone"
    : event.audienceType === "ROLE"
      ? event.roles.map((r) => ROLE_LABELS[r] || r).join(", ")
      : event.classTargets.map((t) => [t.className, t.sectionName].filter(Boolean).join(" ")).join(", ");

/**
 * The management list behind Calendar -> Events and Calendar -> Holidays.
 * `kind` is "event" or "holiday". One B.S. year at a time, oldest first.
 * Admins see everything; a teacher sees and changes the events they added.
 */
const EventManager = ({ kind }) => {
  const { hasRole } = useAuth();
  const prefs = useDatePrefs();
  const isAdmin = hasRole("ADMIN");
  const isHolidays = kind === "holiday";

  const [bsYear, setBsYear] = useState(() => todayBs()?.year || 2083);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(0);
  const [dialog, setDialog] = useState(null); // { event }
  const [importing, setImporting] = useState(false);

  const load = useCallback(() => {
    const range = bsYearRange(bsYear);
    if (!range) return;
    setRows(null);
    calendarService
      .getEvents({ kind, from: range.from, to: range.to, order: "asc", limit: PAGE_SIZE, ...(search.trim() ? { search: search.trim() } : {}), ...(status ? { status } : {}) })
      .then((res) => {
        setRows(res.data || []);
        setTotal(res.pagination?.total ?? (res.data || []).length);
      })
      .catch((error) => {
        setRows([]);
        toast.error(error.response?.data?.message || "Could not load the list");
      });
  }, [kind, bsYear, search, status]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const remove = async (event) => {
    const ok = await confirmDialog({
      title: `Delete "${event.title}"?`,
      message: event.recurrence !== "NONE" ? "This removes every repeat of it from the calendar. It cannot be undone." : "It will be removed from everyone's calendar. This cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await calendarService.deleteEvent(event.id);
      toast.success("Deleted");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete");
    }
  };

  const years = Array.from({ length: 7 }, (_, i) => (todayBs()?.year || 2083) - 3 + i).filter((y) => y >= MIN_BS_YEAR && y <= MAX_BS_YEAR);
  const printKind = isHolidays ? "holidays" : "events";

  return (
    <div>
      <PageHeader
        title={isHolidays ? "Holidays" : isAdmin ? "Events" : "My Class Events"}
        description={
          isHolidays
            ? "Days the school is closed. Weekly holidays are set in Calendar Settings."
            : isAdmin
              ? "School events, meetings, activities and deadlines."
              : "Activities and deadlines you added for your classes."
        }
        icon={isHolidays ? PartyPopper : CalendarPlus}
        actions={
          <>
            <Link to={`/calendar/print/${printKind}?year=${bsYear}`} className={buttonClasses({ variant: "secondary" })}>
              <Printer size={16} aria-hidden="true" />
              Print list
            </Link>
            {isHolidays && isAdmin && (
              <Button variant="secondary" icon={Download} onClick={() => setImporting(true)} data-guide="holidays.import">
                Import holidays
              </Button>
            )}
            <Button icon={Plus} onClick={() => setDialog({ event: null })} data-guide={isHolidays ? "holidays.add" : "events.add"}>
              {isHolidays ? "Add holiday" : "Add event"}
            </Button>
          </>
        }
      />

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <div className="w-full sm:w-40">
            <SelectInput aria-label="B.S. year" value={bsYear} onChange={(e) => setBsYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{digits(y, prefs.numerals)} B.S.</option>
              ))}
            </SelectInput>
          </div>
          <TextInput icon={Search} aria-label="Search by name" placeholder="Search by name" value={search} onChange={(e) => setSearch(e.target.value)} wrapperClassName="w-full sm:w-64" />
          {isAdmin && (
            <div className="w-full sm:w-40">
              <SelectInput aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Any status</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
              </SelectInput>
            </div>
          )}
          <span className="flex-1" />
          {rows && <span className="text-sm text-slate-500">{total} {isHolidays ? "holiday" : "event"}{total === 1 ? "" : "s"}</span>}
        </div>

        {!rows ? (
          <LoadingBlock text="Loading…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={isHolidays ? PartyPopper : CalendarPlus}
            title={isHolidays ? `No holidays in ${bsYear} yet` : `No events in ${bsYear} yet`}
            description={isHolidays && isAdmin ? "Import the government list, or add your school's own holidays." : "Add the first one with the button above."}
            action={isHolidays && isAdmin ? <Button icon={Download} onClick={() => setImporting(true)}>Import holidays</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-600">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">{isHolidays ? "Holiday" : "Event"}</th>
                  <th className="px-4 py-2.5">For</th>
                  {isHolidays && <th className="px-4 py-2.5">Source</th>}
                  <th className="w-24 px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((event) => (
                  <tr key={event.id} data-testid="calendar-row">
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <span className="font-medium text-slate-900">{itemDateText(event, prefs)}</span>
                      <span className="block text-xs text-slate-500">
                        {weekdayNameOf(event.startDate, prefs.language, true)} · {itemSecondaryDateText(event, prefs)}
                      </span>
                      {!event.isAllDay && <span className="block text-xs text-slate-500">{itemTimeText(event, prefs.numerals)}</span>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="font-medium text-slate-900">{event.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <CategoryChip category={event.category} />
                        {event.status === "DRAFT" && <Badge tone="warning">Draft</Badge>}
                        {!event.isActive && <Badge tone="neutral">Not observed</Badge>}
                        {event.recurrence !== "NONE" && <Badge tone="info">{RECURRENCE_OPTIONS.find((r) => r.value === event.recurrence)?.label}</Badge>}
                      </span>
                      {event.description && <span className="mt-1 block max-w-md truncate text-xs text-slate-500">{event.description}</span>}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-700">
                      {audienceText(event)}
                      {event.applicability && <span className="block max-w-56 text-xs text-slate-500">{event.applicability}</span>}
                    </td>
                    {isHolidays && (
                      <td className="px-4 py-3 align-top text-xs text-slate-600">
                        {event.source || "Added by the school"}
                        {event.sourcePublishedDate && <span className="block text-slate-500">Published: {event.sourcePublishedDate} B.S.</span>}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right align-top whitespace-nowrap">
                      <IconButton icon={Pencil} label={`Edit ${event.title}`} variant="ghost" onClick={() => setDialog({ event })} />
                      <IconButton icon={Trash2} label={`Delete ${event.title}`} variant="ghost" onClick={() => remove(event)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows && total > rows.length && (
          <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">Showing the first {rows.length}. Search to narrow the list.</p>
        )}
      </Card>

      <EventDialog open={Boolean(dialog)} kind={kind} event={dialog?.event || null} onClose={() => setDialog(null)} onSaved={load} />
      {isHolidays && <HolidayImportDialog open={importing} onClose={() => setImporting(false)} onImported={load} />}
    </div>
  );
};

export default EventManager;
