/**
 * Options for the NEB grade sheet (ReportSheet).
 *
 * There is ONE design: individual and bulk print render the same sheet with the
 * same options and the same stylesheet (nebSheetStyles.js). Bulk used to have
 * its own compact variant and its own CSS; both are gone.
 *
 * A school's stored layout (payload `layout`, School Settings -> Report Card)
 * overrides these through `layoutOptions`.
 */
export const SHEET_OPTIONS = {
  showEmblem: true,
  reportTitle: "GRADE SHEET / REPORT CARD",
  showAttendanceStrip: true,
  showSummaryGrid: true,
  showRemarks: true,
  signatures: ["CLASS TEACHER", "EXAM CO-ORDINATOR", "PRINCIPAL"],
  footerText: "",
  showGradeLegend: false,
};

/** The school's layout mapped onto the options above. No layout -> no change. */
export const layoutOptions = (layout) => {
  if (!layout || layout.template !== "nebGradeSheet") return {};
  return {
    signatures: Array.isArray(layout.signatures) ? layout.signatures : SHEET_OPTIONS.signatures,
    footerText: layout.footerText || "",
    showGradeLegend: Boolean(layout.showGradeLegend),
    reportTitle: layout.title || SHEET_OPTIONS.reportTitle,
    showAttendanceStrip: Boolean(layout.showAttendance),
    showSummaryGrid: Boolean(layout.showSummaryGrid),
    showRemarks: Boolean(layout.showTeacherRemarks),
  };
};

export default SHEET_OPTIONS;
