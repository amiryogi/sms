import React from "react";
import { cn } from "../../lib/cn";
import { digits, weekdayName } from "../../lib/calendar/dateFormatter";
import { monthGrid, viewSubtitle, viewTitle, weekdayOrder } from "../../lib/calendar/calendarUtils";
import { categoryMeta } from "../../lib/calendar/calendarConstants";

/**
 * A small month for the year-at-a-glance calendar and its printout: day
 * numbers only, holidays and weekly holidays in red, a dot under a day that
 * has something else on it. `print` uses pt sizes and plain black borders.
 */
const MiniMonth = ({ view, byDay, prefs, today, onSelect, print = false }) => {
  const weeks = monthGrid(view, prefs.weekStartsOn);
  const fmt = { language: prefs.language, numerals: prefs.numerals };
  return (
    <section className={cn(print ? "break-inside-avoid" : "rounded-xl border border-slate-200 bg-white p-3")}>
      <header className={cn("flex items-baseline justify-between", print ? "mb-0.5 border-b border-slate-500 pb-0.5" : "mb-2")}>
        <h3 className={cn("font-semibold text-slate-900", print ? "text-[9pt]" : "text-sm")}>{viewTitle(view, fmt)}</h3>
        <span className={cn("text-slate-500", print ? "text-[6.5pt]" : "text-2xs")}>{viewSubtitle(view, fmt)}</span>
      </header>
      <div className="grid grid-cols-7 text-center">
        {weekdayOrder(prefs.weekStartsOn).map((w) => (
          <span
            key={w}
            className={cn(
              "font-medium",
              print ? "text-[6pt]" : "pb-1 text-2xs",
              prefs.weeklyHolidayDays.includes(w) ? (print ? "text-red-600" : "text-risk") : print ? "text-slate-400" : "text-slate-500",
            )}
          >
            {weekdayName(w, prefs.language, true).slice(0, prefs.language === "ne" ? 3 : 2)}
          </span>
        ))}
        {weeks.flat().map((cell, i) => {
          if (!cell || !cell.inMonth) return <span key={i} />;
          const items = byDay.get(cell.ad) || [];
          const holiday = items.find((x) => x.isHoliday);
          const other = items.find((x) => !x.isHoliday);
          const red = Boolean(holiday) || prefs.weeklyHolidayDays.includes(cell.weekday);
          const label = digits(cell.label, prefs.numerals);
          const title = items.map((x) => x.title).join(", ");
          const inner = (
            <>
              <span className={cn(print ? "text-[7.5pt] leading-[1.35]" : "text-xs leading-6", red ? cn("font-semibold", print ? "text-red-600" : "text-risk") : "text-slate-800")}>{label}</span>
              {other && <span className={cn("absolute left-1/2 -translate-x-1/2 rounded-full", print ? "bottom-0 size-[2.5pt] bg-slate-700" : cn("bottom-0.5 size-1", categoryMeta(other.category).dot))} aria-hidden="true" />}
            </>
          );
          if (print || !onSelect) {
            return (
              <span key={cell.ad} className={cn("relative", holiday && print && "bg-slate-200")} title={title || undefined}>
                {inner}
              </span>
            );
          }
          return (
            <button
              key={cell.ad}
              type="button"
              title={title || undefined}
              onClick={() => onSelect(cell.ad)}
              className={cn(
                "relative cursor-pointer rounded-md hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-600",
                holiday && "bg-risk-surface",
                cell.ad === today && "ring-1 ring-brand-500 ring-inset",
              )}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default MiniMonth;
