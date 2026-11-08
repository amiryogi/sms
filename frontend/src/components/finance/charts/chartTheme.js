/**
 * Chart colours and shared settings for the finance dashboard.
 *
 * Series colours come from the validated reference palette (dataviz skill,
 * references/palette.md): blue then orange, validated as an adjacent pair for
 * colour-blind separation and contrast (CVD ΔE 24.7, normal-vision ΔE 33.6,
 * both ≥ 3:1 on white). They are deliberately not the school's brand colour,
 * which can be any hue and could collide with status red.
 *
 * Status colours are reserved for fee states and always shown with a label.
 */
export const SERIES = {
  collected: "#2a78d6", // slot 1, blue
  outstanding: "#eb6834", // slot 2, orange
};

export const STATUS_COLORS = {
  paid: "#0ca30c", // good
  partial: "#fab219", // warning
  overdue: "#d03b3b", // critical
  pending: "#94a3b8", // neutral (slate-400): owed but not yet due
};

export const AXIS = {
  tick: { fill: "#64748b", fontSize: 12 }, // slate-500
  line: "#e2e8f0", // slate-200
  grid: "#f1f5f9", // slate-100
};

/** Rs. 12,500 → "12.5k"; for compact axis ticks only. */
export const compactRs = (n) => {
  const v = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (v >= 10000000) return `${sign}${(v / 10000000).toFixed(1).replace(/\.0$/, "")}cr`;
  if (v >= 100000) return `${sign}${(v / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  if (v >= 1000) return `${sign}${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${sign}${v}`;
};

/** A round axis maximum (1, 2, 4, 6, 8 × 10ⁿ) at or above `max`: with 5 ticks every step is a whole number (40k → 10k steps). */
export const niceMax = (max) => {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 4, 6, 8, 10]) if (m * step >= max) return m * step;
  return 10 * step;
};

/** "Kartik 2083" → "Kar ’83": short enough for an axis, and months of two years stay distinct. */
export const shortBsMonth = (label = "") => {
  const [name, year] = String(label).split(" ");
  return year ? `${name.slice(0, 3)} ’${year.slice(-2)}` : name;
};

/** Long category names on an axis: cut with an ellipsis (the tooltip and table show them in full). */
export const clip = (text, n = 14) => (String(text).length > n ? `${String(text).slice(0, n - 1)}…` : String(text));
