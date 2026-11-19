import React from "react";
import { cn } from "../../lib/cn";
import { EmptyState } from "../ui";
import { CalendarDays } from "lucide-react";
import { digits, weekdayName, formatByPrefs, formatSecondary, weekdayNameOf } from "../../lib/calendar/dateFormatter";
import { weekdayOrder } from "../../lib/calendar/calendarUtils";
import { CategoryDot, ItemRow } from "./CalendarParts";
import { itemTimeText } from "./calendarItems";

/*
 * The three ways of looking at the school calendar. Each takes the cells or
 * days to draw and a Map of AD day -> items (lib/calendar/calendarUtils), and
 * only draws: month lengths, weekdays and who sees what are decided elsewhere.
 */

const MAX_PER_CELL = 3;

/** A month as a grid of weeks. `weeks` comes from monthGrid(). */
export const MonthView = ({ weeks, byDay, prefs, mode, today, selected, onSelect }) => {
  const order = weekdayOrder(prefs.weekStartsOn);
  return (
    <div role="grid" aria-label="Month" className="overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
      <div role="row" className="grid grid-cols-7 gap-px">
        {order.map((w) => (
          <div
            key={w}
            role="columnheader"
            className={cn("bg-slate-50 px-1 py-2 text-center text-xs font-semibold", prefs.weeklyHolidayDays.includes(w) ? "text-risk" : "text-slate-600")}
          >
            <span className="hidden sm:inline">{weekdayName(w, prefs.language)}</span>
            <span className="sm:hidden">{weekdayName(w, prefs.language, true)}</span>
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div role="row" key={wi} className="mt-px grid grid-cols-7 gap-px">
          {week.map((cell, ci) => {
            if (!cell) return <div key={ci} role="gridcell" className="min-h-16 bg-slate-50 sm:min-h-24" />;
            const items = byDay.get(cell.ad) || [];
            const holiday = items.some((i) => i.isHoliday);
            const weekly = prefs.weeklyHolidayDays.includes(cell.weekday);
            const isToday = cell.ad === today;
            const isSelected = cell.ad === selected;
            return (
              <div role="gridcell" key={cell.ad} aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => onSelect(cell.ad)}
                  data-day={cell.ad}
                  aria-label={`${formatByPrefs(cell.ad, { ...prefs, calendar: "both" })}, ${items.length} item${items.length === 1 ? "" : "s"}`}
                  className={cn(
                    // The day number sits in the middle of the box; the other calendar's
                    // number in the lower right corner (pb- keeps room for it under the events).
                    "relative flex h-full min-h-20 w-full cursor-pointer flex-col items-stretch gap-1 p-1 pb-5 text-left transition-colors sm:min-h-28 sm:p-1.5 sm:pb-6",
                    "focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-brand-600",
                    !cell.inMonth ? "bg-slate-50" : holiday || weekly ? "bg-risk-surface/60" : "bg-white",
                    isSelected ? "ring-2 ring-brand-500 ring-inset" : "hover:bg-slate-50",
                  )}
                >
                  <span className="flex flex-1 items-center justify-center">
                    <span
                      className={cn(
                        "inline-flex size-9 items-center justify-center rounded-full text-lg leading-none font-semibold tabular-nums sm:size-12 sm:text-3xl",
                        isToday
                          ? "bg-brand-600 text-brand-fg"
                          : !cell.inMonth
                            ? "text-slate-400"
                            : holiday || weekly
                              ? "text-risk"
                              : "text-slate-800",
                      )}
                    >
                      {cell.label === null ? "" : digits(cell.label, prefs.numerals)}
                    </span>
                  </span>
                  <span
                    className={cn("absolute right-1.5 bottom-1 text-xs leading-none font-medium tabular-nums sm:right-2 sm:bottom-1.5 sm:text-sm", cell.inMonth ? "text-slate-500" : "text-slate-400")}
                    aria-hidden="true"
                  >
                    {cell.altLabel === null ? "" : digits(cell.altLabel, mode === "bs" ? "en" : prefs.numerals)}
                  </span>
                  {/* Names on wide screens, dots on phones */}
                  <span className="hidden flex-col gap-0.5 sm:flex">
                    {items.slice(0, MAX_PER_CELL).map((item) => (
                      <span key={item.key} className="flex items-center gap-1 truncate text-2xs leading-tight text-slate-700">
                        <CategoryDot category={item.category} className="size-1.5" />
                        <span className="truncate">{item.title}</span>
                      </span>
                    ))}
                    {items.length > MAX_PER_CELL && <span className="text-2xs font-medium text-slate-500">+{items.length - MAX_PER_CELL} more</span>}
                  </span>
                  <span className="flex flex-wrap gap-0.5 sm:hidden">
                    {items.slice(0, 4).map((item) => (
                      <CategoryDot key={item.key} category={item.category} className="size-1.5" />
                    ))}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Seven days side by side (stacked on a phone). `days` comes from weekOf(). */
export const WeekView = ({ days, byDay, prefs, today, selected, onSelect }) => (
  <div className="grid gap-2 sm:grid-cols-7">
    {days.map((cell, i) => {
      if (!cell) return <div key={i} />;
      const items = byDay.get(cell.ad) || [];
      const off = prefs.weeklyHolidayDays.includes(cell.weekday) || items.some((x) => x.isHoliday);
      return (
        <button
          key={cell.ad}
          type="button"
          onClick={() => onSelect(cell.ad)}
          aria-pressed={cell.ad === selected}
          className={cn(
            "flex min-h-24 cursor-pointer flex-col rounded-xl border p-2 text-left transition-colors sm:min-h-56",
            "focus-visible:outline-2 focus-visible:outline-brand-600",
            off ? "border-risk-line bg-risk-surface/60" : "border-slate-200 bg-white",
            cell.ad === selected ? "ring-2 ring-brand-500" : "hover:border-slate-300",
          )}
        >
          <span className={cn("text-xs font-semibold", off ? "text-risk" : "text-slate-500")}>{weekdayName(cell.weekday, prefs.language, true)}</span>
          <span className="flex items-baseline gap-1.5">
            <span className={cn("text-lg leading-tight font-semibold tabular-nums", cell.ad === today ? "text-brand-700" : off ? "text-risk" : "text-slate-900")}>
              {formatByPrefs(cell.ad, { ...prefs, calendar: prefs.calendar === "ad" ? "ad" : "bs" }).split(" ").slice(0, 2).join(" ")}
            </span>
          </span>
          <span className="text-2xs text-slate-500">{formatSecondary(cell.ad, prefs)}</span>
          <span className="mt-1.5 flex flex-col gap-1">
            {items.map((item) => (
              <span key={item.key} className="flex items-start gap-1 text-xs leading-tight text-slate-700">
                <CategoryDot category={item.category} className="mt-1 size-1.5" />
                <span className="min-w-0">
                  <span className="block truncate">{item.title}</span>
                  {!item.isAllDay && item.startTime && <span className="block text-2xs text-slate-500">{itemTimeText(item, prefs.numerals)}</span>}
                </span>
              </span>
            ))}
          </span>
        </button>
      );
    })}
  </div>
);

/** A dated list. `days` is an array of AD days in order; days with nothing are skipped. */
export const AgendaView = ({
  days,
  byDay,
  prefs,
  today,
  hasRole,
  onOpen,
  emptyTitle = "Nothing on the calendar in this period",
  emptyText = "Holidays, exams, events and deadlines appear here once they are added.",
}) => {
  const filled = days.filter((d) => (byDay.get(d) || []).length > 0);
  if (!filled.length) return <EmptyState compact icon={CalendarDays} title={emptyTitle} description={emptyText} />;
  return (
    <ol className="divide-y divide-slate-200">
      {filled.map((day) => (
        <li key={day} className="grid gap-x-4 gap-y-1 py-3 sm:grid-cols-[11rem_1fr]">
          <div>
            <p className={cn("text-sm font-semibold", day === today ? "text-brand-700" : "text-slate-900")}>
              {formatByPrefs(day, { ...prefs, calendar: prefs.calendar === "ad" ? "ad" : "bs" })}
              {day === today && <span className="ml-1.5 text-xs font-medium">Today</span>}
            </p>
            <p className="text-xs text-slate-500">
              {weekdayNameOf(day, prefs.language)}, {formatSecondary(day, prefs)}
            </p>
          </div>
          <ul className="min-w-0">
            {(byDay.get(day) || []).map((item) => (
              <ItemRow key={`${day}-${item.key}`} item={item} prefs={prefs} hasRole={hasRole} onOpen={onOpen} className="py-1" />
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
};
