/**
 * Shared grade helpers.
 *
 * The backend is the authority on grades (CLAUDE.md invariant #8). Prefer a grade
 * that came from the API -- `subject.finalGrade`, `result.grade`, `summary.gpa` --
 * over anything derived here.
 *
 * `DEFAULT_GRADE_BANDS` mirrors `backend/src/utils/gradeCalculator.js` and exists
 * only as a fallback for screens that have no band data to hand. Every function
 * below takes a `bands` argument so a caller holding the API's `gradeReference`
 * payload can pass the school's real scale instead. Once grade scales become
 * per-school data, `gradeReference` is the channel: no new wiring needed.
 *
 * Do NOT reimplement a grade table anywhere else in the frontend.
 */

/** Fallback only -- the current official NEB 8-band scale. */
export const DEFAULT_GRADE_BANDS = [
  { min: 90, max: 100, grade: "A+", gpa: 4.0, description: "Outstanding" },
  { min: 80, max: 90, grade: "A", gpa: 3.6, description: "Excellent" },
  { min: 70, max: 80, grade: "B+", gpa: 3.2, description: "Very Good" },
  { min: 60, max: 70, grade: "B", gpa: 2.8, description: "Good" },
  { min: 50, max: 60, grade: "C+", gpa: 2.4, description: "Satisfactory" },
  { min: 40, max: 50, grade: "C", gpa: 2.0, description: "Acceptable" },
  { min: 35, max: 40, grade: "D", gpa: 1.6, description: "Partially Acceptable" },
  { min: 0, max: 35, grade: "NG", gpa: 0.0, description: "Not Graded" },
];

/**
 * Find the band a percentage falls in. Bands are scanned top-down and each band's
 * `max` equals the next band's `min`, so a boundary value lands in the higher band.
 * @returns {object|null} the band, or null for non-numeric input
 */
export function bandForPercentage(percentage, bands = DEFAULT_GRADE_BANDS) {
  const pct = Number(percentage);
  if (!Number.isFinite(pct)) return null;
  const clamped = Math.max(0, Math.min(100, pct));
  return bands.find((b) => clamped >= b.min && clamped <= b.max) || null;
}

/** Letter grade for a percentage. Returns "—" when it cannot be determined. */
export function gradeForPercentage(percentage, bands = DEFAULT_GRADE_BANDS) {
  return bandForPercentage(percentage, bands)?.grade ?? "—";
}

/**
 * Uppercase remark text for a grade, e.g. "A+" -> "OUTSTANDING".
 * Prefer the API's `subject.remark`, which is already the school's wording.
 */
export function remarkForGrade(grade, bands = DEFAULT_GRADE_BANDS) {
  if (grade === "AB") return "ABSENT";
  const band = bands.find((b) => b.grade === grade);
  return band?.description ? band.description.toUpperCase() : "";
}

/** Two-decimal GPA, blank-safe. */
export function formatGpa(gpa) {
  const n = Number(gpa);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

/**
 * Badge colours for a GPA. Derived from the band the GPA sits in rather than
 * hardcoded cutoffs, so a custom scale still colours sensibly.
 */
export function gpaColor(gpa, bands = DEFAULT_GRADE_BANDS) {
  const n = Number(gpa);
  const grey = { bg: "#f1f5f9", text: "#475569" };
  if (!Number.isFinite(n)) return grey;

  const sorted = [...bands].sort((a, b) => b.gpa - a.gpa);
  const max = sorted[0]?.gpa || 4.0;
  const ratio = max > 0 ? n / max : 0;

  if (ratio >= 0.9) return { bg: "#dcfce7", text: "#166534" }; // green
  if (ratio >= 0.7) return { bg: "#dbeafe", text: "#1e40af" }; // blue
  if (ratio >= 0.5) return { bg: "#fef3c7", text: "#92400e" }; // amber
  if (ratio > 0) return { bg: "#fed7aa", text: "#9a3412" }; // orange
  return { bg: "#fee2e2", text: "#991b1b" }; // red
}

/** Same palette, keyed by letter -- for grade pills. */
export function gradeColor(grade, bands = DEFAULT_GRADE_BANDS) {
  if (grade === "AB" || grade === "—") return { bg: "#f1f5f9", text: "#475569" };
  const band = bands.find((b) => b.grade === grade);
  return band ? gpaColor(band.gpa, bands) : { bg: "#f1f5f9", text: "#475569" };
}
