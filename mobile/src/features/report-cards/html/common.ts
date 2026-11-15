/**
 * Helpers for the report-card HTML (ports of the web's reportcard/designVars.js
 * and utils/grades.js remarkForGrade). Presentation only: grades, GPA and
 * totals come from the API payload.
 */
import type { GradeBand } from "@/types/api";

/** Escape text for HTML. Every value from the API passes through this. */
export const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Fallback when a payload has no bands: the NEB 8-band scale (as the web's DEFAULT_GRADE_BANDS). */
export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { min: 90, max: 100, grade: "A+", gpa: 4.0, description: "Outstanding" },
  { min: 80, max: 90, grade: "A", gpa: 3.6, description: "Excellent" },
  { min: 70, max: 80, grade: "B+", gpa: 3.2, description: "Very Good" },
  { min: 60, max: 70, grade: "B", gpa: 2.8, description: "Good" },
  { min: 50, max: 60, grade: "C+", gpa: 2.4, description: "Satisfactory" },
  { min: 40, max: 50, grade: "C", gpa: 2.0, description: "Acceptable" },
  { min: 35, max: 40, grade: "D", gpa: 1.6, description: "Partially Acceptable" },
  { min: 0, max: 35, grade: "NG", gpa: 0.0, description: "Not Graded" },
];

/** Uppercase remark for a grade from the card's own scale, e.g. "A+" -> "OUTSTANDING". */
export const remarkForGrade = (grade: string | null | undefined, bands: GradeBand[] = DEFAULT_GRADE_BANDS): string => {
  if (grade === "AB") return "ABSENT";
  const band = bands.find((b) => b.grade === grade);
  return band?.description ? band.description.toUpperCase() : "";
};

const NUMBER_VARS: Record<string, [string, string]> = {
  marginTop: ["--rc-margin-top", "mm"],
  marginBottom: ["--rc-margin-bottom", "mm"],
  marginLeft: ["--rc-margin-left", "mm"],
  marginRight: ["--rc-margin-right", "mm"],
  schoolNameSize: ["--rc-school-name-size", "pt"],
  schoolNameWeight: ["--rc-school-name-weight", ""],
  schoolNameLineHeight: ["--rc-school-name-line-height", ""],
  logoWidth: ["--rc-logo-width", "mm"],
  logoHeight: ["--rc-logo-height", "mm"],
  addressSize: ["--rc-address-size", "pt"],
  contactSize: ["--rc-contact-size", "pt"],
  headerSpacing: ["--rc-header-spacing", "mm"],
  titleSize: ["--rc-title-size", "pt"],
  titleWeight: ["--rc-title-weight", ""],
  titleMarginTop: ["--rc-title-margin-top", "mm"],
  titleMarginBottom: ["--rc-title-margin-bottom", "mm"],
  infoLabelSize: ["--rc-info-label-size", "pt"],
  infoValueSize: ["--rc-info-value-size", "pt"],
  infoGap: ["--rc-info-gap", "mm"],
  infoColumns: ["--rc-info-columns", ""],
  tableFontSize: ["--rc-table-font-size", "pt"],
  tableHeaderSize: ["--rc-table-header-size", "pt"],
  rowPadding: ["--rc-row-padding", "mm"],
  cellPaddingX: ["--rc-cell-padding-x", "mm"],
  borderWidth: ["--rc-border-width", "pt"],
  subjectWidth: ["--rc-subject-width", "%"],
  summaryLabelSize: ["--rc-summary-label-size", "pt"],
  gpaSize: ["--rc-gpa-size", "pt"],
  signatureHeight: ["--rc-signature-height", "mm"],
  signatureLabelSize: ["--rc-signature-label-size", "pt"],
  footerSize: ["--rc-footer-size", "pt"],
};

const ALIGN_VARS: Record<string, string> = {
  schoolNameAlign: "--rc-header-align",
  titleAlign: "--rc-title-align",
  subjectAlign: "--rc-subject-align",
  marksAlign: "--rc-marks-align",
};
const ALIGNMENTS = ["left", "center", "right"];

const FONT_STACKS: Record<string, string> = {
  inter: '"Inter", -apple-system, Roboto, sans-serif',
  times: '"Times New Roman", Times, serif',
  arial: "Arial, Helvetica, sans-serif",
};

const LOGO_POSITIONS: Record<string, Record<string, string>> = {
  left: { "--rc-header-direction": "row", "--rc-logo-display": "block" },
  right: { "--rc-header-direction": "row-reverse", "--rc-logo-display": "block" },
  hidden: { "--rc-header-direction": "row", "--rc-logo-display": "none" },
};

/**
 * The school's report-card design (payload `layout.design`, already validated
 * by the backend) as an inline style of CSS variables; "" when there is none.
 */
export const designStyle = (design: Record<string, unknown> | null | undefined): string => {
  if (!design || typeof design !== "object") return "";
  const vars: Record<string, string> = {};
  for (const [key, [name, unit]] of Object.entries(NUMBER_VARS)) {
    const value = design[key];
    if (typeof value === "number" && Number.isFinite(value)) vars[name] = `${value}${unit}`;
  }
  for (const [key, name] of Object.entries(ALIGN_VARS)) {
    const value = design[key];
    if (typeof value === "string" && ALIGNMENTS.includes(value)) vars[name] = value;
  }
  const font = design.fontFamily;
  if (typeof font === "string" && FONT_STACKS[font]) vars["--rc-font-family"] = FONT_STACKS[font];
  const logo = design.logoPosition;
  if (typeof logo === "string" && LOGO_POSITIONS[logo]) Object.assign(vars, LOGO_POSITIONS[logo]);
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
};

/** The grade scale reference table (GradeLegend.jsx). */
export const gradeLegendHtml = (bands: GradeBand[] | undefined): string => {
  if (!bands?.length) return "";
  return `<section class="rc-grade-legend"><table>
<thead><tr><th>Grade</th>${bands.map((b) => `<th>${esc(b.grade)}</th>`).join("")}</tr></thead>
<tbody>
<tr><td>Marks %</td>${bands.map((b) => `<td>${esc(b.min)}–${esc(b.max)}</td>`).join("")}</tr>
<tr><td>Grade point</td>${bands.map((b) => `<td>${esc(Number(b.gpa).toFixed(1))}</td>`).join("")}</tr>
</tbody></table></section>`;
};

/** One decimal for a number, "—" otherwise (`toFixed` on the web's optional chaining). */
export const fixed = (v: unknown, digits: number, fallback = "—") => (typeof v === "number" && Number.isFinite(v) ? v.toFixed(digits) : fallback);
