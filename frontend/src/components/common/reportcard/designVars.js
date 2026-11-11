/**
 * Turns a report-card design (payload `layout.design`, validated and completed
 * by the backend's utils/reportCardDesign.js) into CSS custom properties for
 * the NEB sheet. nebSheetStyles.js reads them with the old fixed values as
 * fallbacks, so a card with no design prints as it always has.
 *
 * Presentation only: ranges and defaults live in the backend spec.
 */
const NUMBER_VARS = {
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

const ALIGN_VARS = {
  schoolNameAlign: "--rc-header-align",
  titleAlign: "--rc-title-align",
  subjectAlign: "--rc-subject-align",
  marksAlign: "--rc-marks-align",
};
const ALIGNMENTS = ["left", "center", "right"];

const FONT_STACKS = {
  inter: 'var(--font-sans, "Inter", sans-serif)',
  times: '"Times New Roman", Times, serif',
  arial: "Arial, Helvetica, sans-serif",
};

const LOGO_POSITIONS = {
  left: { "--rc-header-direction": "row", "--rc-logo-display": "block" },
  right: { "--rc-header-direction": "row-reverse", "--rc-logo-display": "block" },
  hidden: { "--rc-header-direction": "row", "--rc-logo-display": "none" },
};

/** A style object of CSS variables; empty when there is no design. */
export const designVars = (design) => {
  if (!design || typeof design !== "object") return {};
  const vars = {};
  for (const [key, [name, unit]] of Object.entries(NUMBER_VARS)) {
    const value = design[key];
    if (typeof value === "number" && Number.isFinite(value)) vars[name] = `${value}${unit}`;
  }
  for (const [key, name] of Object.entries(ALIGN_VARS)) {
    if (ALIGNMENTS.includes(design[key])) vars[name] = design[key];
  }
  if (FONT_STACKS[design.fontFamily]) vars["--rc-font-family"] = FONT_STACKS[design.fontFamily];
  Object.assign(vars, LOGO_POSITIONS[design.logoPosition] || {});
  return vars;
};

export default designVars;
