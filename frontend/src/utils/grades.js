/**
 * Shared grade helpers.
 *
 * The backend is the authority on grades (CLAUDE.md invariant #8). Prefer a grade
 * that came from the API -- `subject.finalGrade`, `result.grade`, `summary.gpa` --
 * over anything derived here.
 *
 * Grade scales are per school. A report-card payload carries the bands of the
 * scale that card was graded on as `gradeReference`; pass it as the `bands`
 * argument of every function below. `DEFAULT_GRADE_BANDS` is the NEB 8-band
 * scale and is only a fallback for screens with no band data to hand -- with a
 * school on another scale (e.g. legacy 9-band's D+ / E) it will not know every
 * letter.
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
