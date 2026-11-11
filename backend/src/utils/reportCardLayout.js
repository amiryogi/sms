/**
 * Report-card layout: what a school's printed report card shows.
 *
 * Stored as JSON on `School.reportCardConfig`. A null column means the NEB
 * grade sheet this system has always printed, so a school that never opens the
 * setting sees no change.
 *
 * Two templates exist:
 *   - nebGradeSheet      the original sheet: TH / IN rows per subject, credit
 *                        hours, summary grid. Only a few settings apply to it.
 *   - performanceReport  one row per subject, obtained grade split into Theory /
 *                        Practical when the exam has practicals, final grade,
 *                        grade point. Matches the SVI sample marksheets
 *                        (marksheetformat1-4.jpeg). Every setting applies.
 *
 * Pure: no Prisma, no Express. Unit-tested in __tests__/reportCardLayout.test.js.
 */

const { convertADToBS } = require("./dateConverter");
const { validateDesign, normalizeDesign, DEFAULT_DESIGN } = require("./reportCardDesign");

const TEMPLATES = ["nebGradeSheet", "performanceReport"];
const MODES = ["grades", "marks", "both"];
const SPLITS = ["auto", "always", "never"];
const REMARK_COLUMNS = ["description", "blank", "hidden"];
const STUDENT_CODE_FIELDS = ["admissionNumber", "none"];
const CLASS_NAME_STYLES = ["name", "wordAndNumeral"];

const MAX_TITLE = 80;
const MAX_SIGNATURES = 4;
const MAX_SIGNATURE_LABEL = 40;
const MAX_FOOTER = 600;
const MAX_TABLE_ROWS = 20;

const GUARDIAN_NOTE =
  "Dear Guardian,\n" +
  "Please acknowledge the receipt of this Performance Report (and give " +
  "necessary guidance and instruction to your ward in order to correct or " +
  "improve his/her weakness).";

/** Exactly what the report card printed before layouts existed. */
const NEB_GRADE_SHEET = Object.freeze({
  template: "nebGradeSheet",
  title: "GRADE SHEET / REPORT CARD",
  mode: "grades",
  theoryPracticalSplit: "auto",
  showSubjectCode: false,
  showCreditHours: true,
  remarkColumn: "description",
  showAttendance: true,
  countLateAsPresent: true,
  showPercentage: false,
  showRank: true,
  showResult: true,
  showSummaryGrid: true,
  showGradeLegend: false,
  showTeacherRemarks: true,
  signatures: Object.freeze(["CLASS TEACHER", "EXAM CO-ORDINATOR", "PRINCIPAL"]),
  showPrincipalName: false,
  showSeal: false,
  showWatermark: false,
  footerText: "",
  studentCodeField: "admissionNumber",
  classNameStyle: "name",
  minTableRows: 0,
});

/** The SVI "Performance Report": grades only, no totals, rank or percentage. */
const PERFORMANCE_REPORT = Object.freeze({
  template: "performanceReport",
  title: "Performance Report",
  mode: "grades",
  theoryPracticalSplit: "auto",
  showSubjectCode: false,
  showCreditHours: false,
  remarkColumn: "blank",
  // fmt1 prints attendance, fmt2-4 do not. Turn on once working days are set.
  showAttendance: false,
  countLateAsPresent: true,
  showPercentage: false,
  showRank: false,
  showResult: false,
  showSummaryGrid: false,
  showGradeLegend: false,
  showTeacherRemarks: false,
  signatures: Object.freeze(["Class Teacher", "Principal"]),
  showPrincipalName: true,
  showSeal: true,
  showWatermark: false,
  footerText: GUARDIAN_NOTE,
  studentCodeField: "admissionNumber",
  classNameStyle: "wordAndNumeral",
  minTableRows: 10,
});

const DEFAULT_LAYOUT = NEB_GRADE_SHEET;

const REPORT_CARD_PRESETS = Object.freeze({
  nebGradeSheet: Object.freeze({
    name: "NEB grade sheet",
    description:
      "Theory and internal rows for each subject, credit hours, summary grid. " +
      "What report cards printed before this setting existed.",
    config: NEB_GRADE_SHEET,
  }),
  performanceReport: Object.freeze({
    name: "Performance Report",
    description:
      "One row per subject, grades only, theory and practical columns when " +
      "the exam has practicals, seal and guardian note. Matches the SVI sample sheets.",
    config: PERFORMANCE_REPORT,
  }),
});

const TEMPLATE_DEFAULTS = {
  nebGradeSheet: NEB_GRADE_SHEET,
  performanceReport: PERFORMANCE_REPORT,
};

/**
 * Which settings each template reads. The admin form shows only these, so it
 * never offers a switch that would do nothing.
 */
const TEMPLATE_FIELDS = Object.freeze({
  nebGradeSheet: Object.freeze([
    "title",
    "showAttendance",
    "countLateAsPresent",
    "showSummaryGrid",
    "showGradeLegend",
    "showTeacherRemarks",
    "signatures",
    "footerText",
  ]),
  performanceReport: Object.freeze(
    Object.keys(PERFORMANCE_REPORT).filter((k) => k !== "template"),
  ),
});

const BOOLEAN_FIELDS = Object.keys(NEB_GRADE_SHEET).filter(
  (k) => typeof NEB_GRADE_SHEET[k] === "boolean",
);

const ENUM_FIELDS = {
  template: TEMPLATES,
  mode: MODES,
  theoryPracticalSplit: SPLITS,
  remarkColumn: REMARK_COLUMNS,
  studentCodeField: STUDENT_CODE_FIELDS,
  classNameStyle: CLASS_NAME_STYLES,
};

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Check a layout sent by the admin form. Returns `[{ field, message }]`, empty
 * when valid. Missing settings are allowed (they take the template's default);
 * settings with the wrong type or an unknown value are not.
 */
const validateLayout = (raw) => {
  if (!isPlainObject(raw)) {
    return [{ field: "config", message: "Layout must be an object" }];
  }

  const errors = [];
  const add = (field, message) => errors.push({ field, message });

  if (raw.template === undefined) add("template", "Choose a template");

  for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
    if (raw[field] !== undefined && !allowed.includes(raw[field])) {
      add(field, `Must be one of: ${allowed.join(", ")}`);
    }
  }

  for (const field of BOOLEAN_FIELDS) {
    if (raw[field] !== undefined && typeof raw[field] !== "boolean") {
      add(field, "Must be true or false");
    }
  }

  if (raw.title !== undefined) {
    if (typeof raw.title !== "string" || !raw.title.trim()) {
      add("title", "Title is required");
    } else if (raw.title.trim().length > MAX_TITLE) {
      add("title", `At most ${MAX_TITLE} characters`);
    }
  }

  if (raw.footerText !== undefined) {
    if (typeof raw.footerText !== "string") {
      add("footerText", "Must be text");
    } else if (raw.footerText.length > MAX_FOOTER) {
      add("footerText", `At most ${MAX_FOOTER} characters`);
    }
  }

  if (raw.signatures !== undefined) {
    if (!Array.isArray(raw.signatures)) {
      add("signatures", "Must be a list");
    } else {
      if (raw.signatures.length > MAX_SIGNATURES) {
        add("signatures", `At most ${MAX_SIGNATURES} signatures`);
      }
      raw.signatures.forEach((label, i) => {
        if (typeof label !== "string" || !label.trim()) {
          add(`signatures[${i}]`, "Label is required");
        } else if (label.trim().length > MAX_SIGNATURE_LABEL) {
          add(`signatures[${i}]`, `At most ${MAX_SIGNATURE_LABEL} characters`);
        }
      });
    }
  }

  if (raw.minTableRows !== undefined) {
    const n = raw.minTableRows;
    if (!Number.isInteger(n) || n < 0 || n > MAX_TABLE_ROWS) {
      add("minTableRows", `Whole number from 0 to ${MAX_TABLE_ROWS}`);
    }
  }

  // How the sheet looks (sizes, spacing, margins): utils/reportCardDesign.js
  errors.push(...validateDesign(raw.design));

  return errors;
};

/**
 * Turn whatever is stored (null, an old partial object, hand-edited JSON) into
 * a complete layout. Never throws: an unreadable value falls back to the
 * template default, so a bad row can never stop a report card printing.
 */
const normalizeLayout = (raw) => {
  if (!isPlainObject(raw)) return { ...DEFAULT_LAYOUT, signatures: [...DEFAULT_LAYOUT.signatures], design: { ...DEFAULT_DESIGN } };

  const base = TEMPLATE_DEFAULTS[raw.template] || DEFAULT_LAYOUT;
  const out = { ...base, signatures: [...base.signatures] };

  for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
    if (field !== "template" && allowed.includes(raw[field])) out[field] = raw[field];
  }
  for (const field of BOOLEAN_FIELDS) {
    if (typeof raw[field] === "boolean") out[field] = raw[field];
  }
  if (typeof raw.title === "string" && raw.title.trim()) {
    out.title = raw.title.trim().slice(0, MAX_TITLE);
  }
  if (typeof raw.footerText === "string") {
    out.footerText = raw.footerText.slice(0, MAX_FOOTER);
  }
  if (Array.isArray(raw.signatures)) {
    out.signatures = raw.signatures
      .filter((s) => typeof s === "string" && s.trim())
      .map((s) => s.trim().slice(0, MAX_SIGNATURE_LABEL))
      .slice(0, MAX_SIGNATURES);
  }
  if (
    Number.isInteger(raw.minTableRows) &&
    raw.minTableRows >= 0 &&
    raw.minTableRows <= MAX_TABLE_ROWS
  ) {
    out.minTableRows = raw.minTableRows;
  }

  out.design = normalizeDesign(raw.design);

  return out;
};

const NUMBER_WORDS = [
  null, "One", "Two", "Three", "Four", "Five", "Six",
  "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
];

/**
 * "Nine [9]" for grade level 9, as the SVI sheets print it. Null when the
 * class has no numeric grade level (nursery, KG), so the caller prints the
 * class name instead.
 */
const classWithNumeral = (gradeLevel) => {
  const n = Number(gradeLevel);
  return Number.isInteger(n) && NUMBER_WORDS[n] ? `${NUMBER_WORDS[n]} [${n}]` : null;
};

/**
 * "Date of Issue" in Bikram Sambat, dash-separated as the sample sheets print
 * it ("2083-05-06"). Null when there is no date.
 */
const issueDateBS = (adDate) => {
  const bs = adDate ? convertADToBS(adDate) : null;
  if (!bs) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${bs.year}-${pad(bs.month)}-${pad(bs.day)}`;
};

/**
 * School fields every report-card response prints, plus the stored layout.
 * A Prisma `select`; kept here so the report-card and layout controllers
 * can't drift apart (getReportCard once fetched six of these and printed
 * `undefined` for the rest).
 */
const SCHOOL_REPORT_SELECT = Object.freeze({
  id: true,
  name: true,
  address: true,
  phone: true,
  email: true,
  logoUrl: true,
  tagline: true,
  website: true,
  landlineNumber: true,
  principalName: true,
  establishedYear: true,
  reportCardConfig: true,
});

/** The `school` block of a report-card payload. Leaves the config out. */
const schoolForReport = (school) => ({
  name: school.name,
  address: school.address,
  phone: school.phone,
  email: school.email,
  logoUrl: school.logoUrl,
  tagline: school.tagline,
  website: school.website,
  landlineNumber: school.landlineNumber,
  principalName: school.principalName,
  establishedYear: school.establishedYear,
});

/** Presets as the admin API returns them. */
const listPresets = () =>
  Object.entries(REPORT_CARD_PRESETS).map(([key, p]) => ({
    key,
    name: p.name,
    description: p.description,
    config: normalizeLayout(p.config),
  }));

module.exports = {
  TEMPLATES,
  TEMPLATE_FIELDS,
  NEB_GRADE_SHEET,
  PERFORMANCE_REPORT,
  DEFAULT_LAYOUT,
  REPORT_CARD_PRESETS,
  GUARDIAN_NOTE,
  validateLayout,
  normalizeLayout,
  classWithNumeral,
  issueDateBS,
  listPresets,
  SCHOOL_REPORT_SELECT,
  schoolForReport,
};
