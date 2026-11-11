/**
 * Report-card design: how the printed NEB grade sheet LOOKS (sizes, weights,
 * spacing, margins). What it SHOWS is the layout in reportCardLayout.js.
 *
 * Stored as `design` inside `School.reportCardConfig`. Every default below is
 * the value the sheet's stylesheet used before designs existed
 * (frontend reportcard/nebSheetStyles.js), so a school that never opens the
 * settings prints exactly as before.
 *
 * Pure: no Prisma, no Express. Unit-tested in __tests__/reportCardDesign.test.js.
 * The admin form is generated from DESIGN_SPEC (sent by GET /report-card-layout),
 * so ranges live here only.
 */

const num = (group, label, unit, min, max, step, def) => ({ type: "number", group, label, unit, min, max, step, default: def });
const choice = (group, label, options, def) => ({ type: "choice", group, label, options, default: def });

const ALIGN = [
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
];
const WEIGHTS = [
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Extra bold" },
];

const DESIGN_GROUPS = ["Page", "School header", "Report title", "Student information", "Grade sheet", "Summary", "Signatures and footer"];

const DESIGN_SPEC = Object.freeze({
  // Page
  fontFamily: choice("Page", "Font", [
    { value: "inter", label: "Inter (sans-serif)" },
    { value: "times", label: "Times New Roman (serif)" },
    { value: "arial", label: "Arial (sans-serif)" },
  ], "inter"),
  marginTop: num("Page", "Top margin", "mm", 8, 25, 0.5, 15),
  marginBottom: num("Page", "Bottom margin", "mm", 8, 25, 0.5, 15),
  marginLeft: num("Page", "Left margin", "mm", 8, 25, 0.5, 15),
  marginRight: num("Page", "Right margin", "mm", 8, 25, 0.5, 15),

  // School header
  schoolNameSize: num("School header", "School name size", "pt", 12, 32, 0.5, 22),
  schoolNameWeight: choice("School header", "School name weight", WEIGHTS, 700),
  schoolNameLineHeight: num("School header", "School name line height", "", 1, 1.6, 0.05, 1.2),
  schoolNameAlign: choice("School header", "Header text alignment", ALIGN, "center"),
  logoWidth: num("School header", "Logo width", "mm", 10, 40, 0.5, 18.5),
  logoHeight: num("School header", "Logo height", "mm", 10, 40, 0.5, 18.5),
  logoPosition: choice("School header", "Logo position", [
    { value: "left", label: "Left" },
    { value: "right", label: "Right" },
    { value: "hidden", label: "Hidden" },
  ], "left"),
  addressSize: num("School header", "Address size", "pt", 7, 14, 0.5, 10),
  contactSize: num("School header", "Contact details size", "pt", 7, 14, 0.5, 9),
  headerSpacing: num("School header", "Space below header", "mm", 0, 12, 0.5, 4),

  // Report title
  titleSize: num("Report title", "Title size", "pt", 10, 22, 0.5, 16),
  titleWeight: choice("Report title", "Title weight", WEIGHTS, 600),
  titleAlign: choice("Report title", "Title alignment", ALIGN, "center"),
  titleMarginTop: num("Report title", "Space above title", "mm", 0, 10, 0.5, 4),
  titleMarginBottom: num("Report title", "Space below title", "mm", 0, 10, 0.5, 4),

  // Student information
  infoLabelSize: num("Student information", "Label size", "pt", 7, 13, 0.5, 9),
  infoValueSize: num("Student information", "Value size", "pt", 7, 14, 0.5, 11),
  infoGap: num("Student information", "Spacing between fields", "mm", 1, 6, 0.1, 2.6),
  infoColumns: choice("Student information", "Columns", [
    { value: 2, label: "2" },
    { value: 3, label: "3" },
    { value: 4, label: "4" },
  ], 4),

  // Grade sheet
  tableFontSize: num("Grade sheet", "Text size", "pt", 7, 12, 0.5, 9),
  tableHeaderSize: num("Grade sheet", "Header text size", "pt", 7, 12, 0.5, 9),
  rowPadding: num("Grade sheet", "Row height (padding above and below)", "mm", 0.5, 4, 0.1, 1.6),
  cellPaddingX: num("Grade sheet", "Cell side padding", "mm", 0.5, 4, 0.1, 1.1),
  borderWidth: num("Grade sheet", "Border thickness", "pt", 0.5, 2, 0.25, 0.75),
  subjectWidth: num("Grade sheet", "Subject column width", "%", 25, 60, 1, 35),
  subjectAlign: choice("Grade sheet", "Subject name alignment", ALIGN.slice(0, 2), "left"),
  marksAlign: choice("Grade sheet", "Marks and grade alignment", ALIGN, "center"),

  // Summary
  summaryLabelSize: num("Summary", "Label size", "pt", 7, 11, 0.5, 8),
  gpaSize: num("Summary", "GPA and result size", "pt", 10, 22, 0.5, 16),

  // Signatures and footer
  signatureHeight: num("Signatures and footer", "Signature space height", "mm", 6, 30, 0.5, 10.6),
  signatureLabelSize: num("Signatures and footer", "Signature label size", "pt", 7, 12, 0.5, 9),
  footerSize: num("Signatures and footer", "Footer text size", "pt", 6, 11, 0.5, 8),
});

const DEFAULT_DESIGN = Object.freeze(
  Object.fromEntries(Object.entries(DESIGN_SPEC).map(([key, spec]) => [key, spec.default])),
);

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** True when `value` is acceptable for `spec`. */
const accepts = (spec, value) => {
  if (spec.type === "choice") return spec.options.some((o) => o.value === value);
  return typeof value === "number" && Number.isFinite(value) && value >= spec.min && value <= spec.max;
};

/**
 * Check a design sent by the admin form. Returns `[{ field, message }]`, empty
 * when valid. Missing settings are allowed (they take the default); unknown
 * settings and out-of-range values are not.
 */
const validateDesign = (raw) => {
  if (raw === undefined || raw === null) return [];
  if (!isPlainObject(raw)) return [{ field: "design", message: "Design must be an object" }];

  const errors = [];
  for (const [key, value] of Object.entries(raw)) {
    const spec = DESIGN_SPEC[key];
    const field = `design.${key}`;
    if (!spec) {
      errors.push({ field, message: "Unknown design setting" });
    } else if (!accepts(spec, value)) {
      errors.push({
        field,
        message:
          spec.type === "choice"
            ? `Must be one of: ${spec.options.map((o) => o.value).join(", ")}`
            : `Must be a number from ${spec.min} to ${spec.max}${spec.unit ? ` ${spec.unit}` : ""}`,
      });
    }
  }
  return errors;
};

/**
 * A complete design from whatever is stored. Never throws: anything missing,
 * unknown or out of range takes the default, so a bad row cannot break the
 * A4 layout.
 */
const normalizeDesign = (raw) => {
  const out = { ...DEFAULT_DESIGN };
  if (!isPlainObject(raw)) return out;
  for (const [key, spec] of Object.entries(DESIGN_SPEC)) {
    if (accepts(spec, raw[key])) out[key] = raw[key];
  }
  return out;
};

/** The spec as the admin API returns it: groups in order, each with its settings. */
const designSpec = () =>
  DESIGN_GROUPS.map((group) => ({
    group,
    settings: Object.entries(DESIGN_SPEC)
      .filter(([, spec]) => spec.group === group)
      .map(([key, spec]) => ({ key, ...spec })),
  }));

module.exports = { DESIGN_SPEC, DESIGN_GROUPS, DEFAULT_DESIGN, validateDesign, normalizeDesign, designSpec };
