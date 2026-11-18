import React, { createContext, useContext } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";
import { Skeleton } from "./Feedback";
import { STAT_BARS, STAT_TONES, clampProgress, statValueSize } from "./statValue";

/*
 * A labelled figure: the one stat tile in the app.
 *
 * Before this, there were seven: the old `common/StatCard` and six local rivals
 * (finance Dashboard `Kpi`, portal `Tile`, AccountDetail/Collect/ReportCards/
 * ResultsView `Stat`), between them four value sizes, three icon sizes and two
 * label/value orders. Every caller now uses this one.
 *
 * The figure is the content (DESIGN.md: "the data is the design"), so it gets
 * the boldest type on the page and everything around it stays quiet:
 *
 *   label     — what the number is; muted, with an optional decorative icon
 *   value     — the number, tabular, in ink unless it IS a status
 *   sub       — one line of context
 *   progress  — 0–100, a thin bar under the value (a token, never a chart colour)
 *   children  — replaces the value when a tile needs custom content
 *
 *   size    "hero" (dashboards, text-display) | "md" | "sm"
 *   tone    "ink" | "ok" | "warn" | "risk" — colours the value only. A count of
 *           classes is not a warning: if the number is neutral, it is ink.
 *   surface "paper" (its own bordered surface) | "plain" (inside something else)
 *   to      makes the tile a link
 *
 * Inside a `StatGroup` a tile defaults to `surface="plain"` and `size="md"`, and
 * the group draws the rules between tiles.
 */

const GroupContext = createContext(null);

const LABEL_SIZES = { hero: "text-sm", md: "text-sm", sm: "text-xs" };
const VALUE_GAPS = { hero: "mt-3", md: "mt-1.5", sm: "mt-0.5" };
const SKELETONS = { hero: "mt-3 h-10 w-28", md: "mt-1.5 h-8 w-24", sm: "mt-0.5 h-7 w-20" };

export const StatCard = ({
  label,
  value,
  sub,
  icon: Icon,
  tone = "ink",
  size: sizeProp,
  surface: surfaceProp,
  to,
  progress,
  progressTone,
  progressLabel,
  loading = false,
  className,
  children,
  ...props
}) => {
  const group = useContext(GroupContext);
  const size = sizeProp || group?.size || "hero";
  const surface = surfaceProp || (group ? "plain" : "paper");
  const pct = clampProgress(progress);
  const Tag = to ? Link : "div";

  return (
    <Tag
      to={to}
      className={cn(
        // The tile is a size container, so a long hero figure can step down by
        // the tile's own width rather than the viewport's (see statValue.js).
        "@container block min-w-0",
        surface === "paper" && "rounded-xl border border-slate-200 bg-white p-5",
        to && "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        to && (surface === "paper" ? "hover:border-slate-300 hover:bg-slate-50/60" : "hover:bg-slate-50"),
        className,
      )}
      {...props}
    >
      <p className={cn("flex items-center gap-1.5 font-medium text-slate-500", LABEL_SIZES[size])}>
        {/* Decorative: the label beside it says what this is, so 3:1 (slate-300) is enough. */}
        {Icon && <Icon size={size === "sm" ? 14 : 16} className="shrink-0 text-slate-300" aria-hidden="true" />}
        <span className="truncate">{label}</span>
      </p>

      {loading ? (
        <Skeleton className={SKELETONS[size]} />
      ) : (
        children ?? (
          <p
            className={cn(
              "font-semibold tabular-nums",
              size !== "hero" && "tracking-tight", // text-display carries its own tracking
              VALUE_GAPS[size],
              statValueSize(value, size),
              STAT_TONES[tone] || STAT_TONES.ink,
            )}
          >
            {value ?? "—"}
          </p>
        )
      )}

      {pct !== null && !loading && (
        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={progressLabel || `${label}: ${Math.round(pct)}%`}
        >
          <div className={cn("h-full rounded-full", STAT_BARS[progressTone || tone] || STAT_BARS.ink)} style={{ width: `${pct}%` }} />
        </div>
      )}

      {sub && !loading && <div className="mt-1.5 text-xs text-slate-500">{sub}</div>}
    </Tag>
  );
};

const COLUMNS = {
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};

/*
 * A row of related figures, ruled like a ledger instead of boxed one by one
 * ("rules, not boxes"). Each child gets a cell with a rule on its right and
 * bottom; the negative margins tuck the outer edge of those rules under the
 * group's own edge, so only the inner rules show at any column count.
 *
 *   surface "paper" — its own bordered surface (a page-level summary)
 *           "well"  — a tinted strip inside a card (a totals row); the caller
 *                     adds the border on the side that touches the card
 *           "plain" — rules only, no surface
 */
export const StatGroup = ({ columns = 4, surface = "paper", size = "md", className, children, ...props }) => (
  <GroupContext.Provider value={{ size }}>
    <div
      className={cn(
        "overflow-hidden",
        surface === "paper" && "rounded-xl border border-slate-200 bg-white",
        surface === "well" && "bg-slate-50",
        className,
      )}
      {...props}
    >
      <div className={cn("-mr-px -mb-px grid", COLUMNS[columns] || COLUMNS[4])}>
        {React.Children.toArray(children)
          .filter(Boolean)
          .map((child, i) => (
            <div key={child.key ?? i} className="min-w-0 border-r border-b border-slate-200 px-5 py-4">
              {child}
            </div>
          ))}
      </div>
    </div>
  </GroupContext.Provider>
);

export default StatCard;
