import React from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";
import { categoryMeta, SOURCE_LABELS } from "../../lib/calendar/calendarConstants";
import { weekdayNameOf } from "../../lib/calendar/dateFormatter";
import { itemTimeText, itemDateText, itemLink } from "./calendarItems";

/* Small pieces shared by the calendar views, lists and printouts. */

/** The coloured dot for a category. */
export const CategoryDot = ({ category, className }) => (
  <span className={cn("inline-block size-2 shrink-0 rounded-full", categoryMeta(category).dot, className)} aria-hidden="true" />
);

/** A category as a small coloured label. */
export const CategoryChip = ({ category, className }) => {
  const meta = categoryMeta(category);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset", meta.chip, className)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
};

/** One item as a row: dot, title, time or date, and where it comes from. */
export const ItemRow = ({ item, prefs, hasRole, showDate = false, onOpen, className }) => {
  const link = hasRole ? itemLink(item, hasRole) : null;
  const canOpen = item.source === "event" && onOpen;
  const title = (
    <span className={cn("font-medium text-slate-900", item.status === "DRAFT" && "italic text-slate-500")}>
      {item.title}
      {item.status === "DRAFT" && <span className="ml-1.5 text-xs font-normal not-italic text-amber-700">Draft</span>}
    </span>
  );
  return (
    <li className={cn("flex items-start gap-2.5 py-2", className)}>
      <CategoryDot category={item.category} className="mt-1.5" />
      <div className="min-w-0 flex-1 text-sm">
        {canOpen ? (
          <button type="button" onClick={() => onOpen(item)} className="cursor-pointer text-left hover:underline focus-visible:outline-2 focus-visible:outline-brand-600">
            {title}
          </button>
        ) : link ? (
          <Link to={link} className="hover:underline focus-visible:outline-2 focus-visible:outline-brand-600">{title}</Link>
        ) : (
          title
        )}
        <p className="text-xs text-slate-500">
          {showDate && (
            <>
              {weekdayNameOf(item.startDate, prefs.language, true)}, {itemDateText(item, prefs)} ·{" "}
            </>
          )}
          {itemTimeText(item, prefs.numerals)}
          {item.detail ? ` · ${item.detail}` : ""}
          {item.source !== "event" ? ` · ${SOURCE_LABELS[item.source] || ""}` : item.audience && item.audience !== "Everyone" ? ` · ${item.audience}` : ""}
        </p>
        {item.applicability && <p className="text-xs text-slate-500">Applies to: {item.applicability}</p>}
      </div>
    </li>
  );
};

/** The colour key under a calendar. */
export const Legend = ({ categories, className }) => (
  <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600", className)}>
    {categories.map((c) => (
      <li key={c} className="inline-flex items-center gap-1.5">
        <CategoryDot category={c} />
        {categoryMeta(c).label}
      </li>
    ))}
  </ul>
);
