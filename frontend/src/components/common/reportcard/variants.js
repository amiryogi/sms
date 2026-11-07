/**
 * Layout variants for ReportSheet.
 *
 * These reproduce exactly what each caller rendered before the single-card and
 * bulk-print marksheets were unified into one component. They live in their own
 * module so ReportSheet.jsx exports only a component (React Fast Refresh needs
 * that), and so per-school report-card configuration has an obvious home: a
 * school's stored config becomes another object of these same flags.
 */

/** Full single-card view: 3-column header, summary grid, remarks, attendance. */
export const SINGLE = {
  rootClassName: "report-card-a4",
  headerStyle: "detailed",
  showEmblem: true,
  showReportTitle: true,
  reportTitle: "GRADE SHEET / REPORT CARD",
  studentSectionClass: "student-info-section",
  wrapInfoValues: true,
  showAdmissionNumber: true,
  groupSubjectRows: false,
  totalLabelAlign: "right",
  showAttendanceStrip: true,
  showResultStrip: false,
  showSummaryGrid: true,
  showRemarks: true,
  footerInParagraph: true,
  signatures: ["CLASS TEACHER", "EXAM CO-ORDINATOR", "PRINCIPAL"],
  footerText: "",
  showGradeLegend: false,
};

/** Bulk print: compact stacked header, result strip, fits one fixed-height page. */
export const BULK = {
  rootClassName: "report-a4",
  headerStyle: "compact",
  showEmblem: false,
  showReportTitle: false,
  reportTitle: "",
  studentSectionClass: "student-info",
  wrapInfoValues: false,
  showAdmissionNumber: false,
  groupSubjectRows: true,
  totalLabelAlign: "center",
  showAttendanceStrip: false,
  showResultStrip: true,
  showSummaryGrid: false,
  showRemarks: false,
  footerInParagraph: false,
  signatures: ["CLASS TEACHER", "EXAM CO-ORDINATOR", "PRINCIPAL"],
  footerText: "",
  showGradeLegend: false,
};

export const VARIANTS = { single: SINGLE, bulk: BULK };

/**
 * The school's layout (payload `layout`, NEB grade sheet template) mapped onto
 * the flags above. Bulk print keeps its compact one-page design, so only the
 * settings that cannot overflow the page reach it. No layout -> no change.
 */
export const layoutOptions = (layout, variant) => {
  if (!layout || layout.template !== "nebGradeSheet") return {};
  const shared = {
    signatures: Array.isArray(layout.signatures) ? layout.signatures : SINGLE.signatures,
    footerText: layout.footerText || "",
    showGradeLegend: Boolean(layout.showGradeLegend),
  };
  if (variant === "bulk") return shared;
  return {
    ...shared,
    reportTitle: layout.title || SINGLE.reportTitle,
    showAttendanceStrip: Boolean(layout.showAttendance),
    showSummaryGrid: Boolean(layout.showSummaryGrid),
    showRemarks: Boolean(layout.showTeacherRemarks),
  };
};

export default VARIANTS;
