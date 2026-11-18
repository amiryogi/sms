/*
 * How big a stat tile's number is set. Kept out of StatCard.jsx so it can be
 * unit-tested and so fast refresh keeps working.
 *
 * `hero` is the dashboard figure: `text-display` (40px), tabular. A 40px money
 * figure does not fit a quarter-width tile once it reaches lakhs —
 * "Rs. 12,34,567" is about 330px at 40px against a ~220px tile — so the hero
 * steps down by the tile's own width (a container query on the tile), and how
 * far it steps depends on how long the value is. The tiers are fixed strings
 * because Tailwind only generates classes it can find in the source.
 *
 * Width per character is taken as 0.62em, a little over IBM Plex Sans's tabular
 * digit (0.6em), so the figure fits with room to spare.
 *
 * The first tier is unconditional, so it assumes a hero tile is at least
 * HERO_MIN_WIDTH_REM wide inside its padding. The narrowest real case is four
 * tiles beside the sidebar at the xl breakpoint (about 185px). The smallest
 * step, text-2xl, is a floor rather than a guarantee: 0.62em per character
 * overstates a money figure ("Rs." and the commas are narrow), and if a very
 * long one still does not fit it wraps after "Rs." instead of overflowing. Do not put a
 * hero tile in a grid denser than that; use a StatGroup (size "md") instead.
 */

export const HERO_MIN_WIDTH_REM = 11;

export const STAT_SIZES = ["hero", "md", "sm"];

const HERO_TIERS = [
  // [longest value, classes]
  [7, "text-display"],
  [10, "text-2xl @min-[12rem]:text-3xl @min-[16rem]:text-display"],
  [13, "text-2xl @min-[16rem]:text-3xl @min-[21rem]:text-display"],
  [Infinity, "text-2xl @min-[20rem]:text-3xl @min-[27rem]:text-display"],
];

const FIXED = {
  md: "text-2xl",
  sm: "text-lg",
};

/** Text length of a value, or null when it is a React node we cannot measure. */
const lengthOf = (value) => {
  if (typeof value === "string") return value.length;
  if (typeof value === "number") return String(value).length;
  return null;
};

/**
 * Size classes for a stat value. An unmeasurable value (a React node) on a hero
 * tile gets the 10-character tier: big, but safe in a narrow tile.
 */
export const statValueSize = (value, size = "hero") => {
  if (size !== "hero") return FIXED[size] || FIXED.md;
  const len = lengthOf(value) ?? 10;
  return HERO_TIERS.find(([max]) => len <= max)[1];
};

/** Status colour for a figure. Only for numbers that ARE a status (DESIGN.md). */
export const STAT_TONES = {
  ink: "text-slate-900",
  ok: "text-ok",
  warn: "text-warn",
  risk: "text-risk",
};

export const STAT_BARS = {
  ink: "bg-slate-700",
  ok: "bg-ok",
  warn: "bg-warn",
  risk: "bg-risk",
};

/** Clamp a progress value to 0–100; null when there is nothing to draw. */
export const clampProgress = (value) => {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
};
