/**
 * The NEB grade sheet as HTML: a port of the web's reportcard/ReportSheet.jsx
 * (NebSheet) and variants.js. Same classes, so the web's stylesheet
 * (sheetCss.generated.ts) styles it identically. Keep the two in step.
 */
import type { ReportCard } from "@/types/api";
import { designStyle, esc, fixed, gradeLegendHtml, remarkForGrade } from "./common";

const SHEET_OPTIONS = {
  reportTitle: "GRADE SHEET / REPORT CARD",
  showAttendanceStrip: true,
  showSummaryGrid: true,
  showRemarks: true,
  signatures: ["CLASS TEACHER", "EXAM CO-ORDINATOR", "PRINCIPAL"],
  footerText: "",
  showGradeLegend: false,
};

/** variants.js layoutOptions: the school's layout over the defaults. */
export const nebOptions = (layout: ReportCard["layout"] | null | undefined) => {
  if (!layout || layout.template !== "nebGradeSheet") return SHEET_OPTIONS;
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

const info = (label: string, value: unknown) =>
  `<div class="info-item"><span class="label">${esc(label)}</span><span class="value">${esc(value)}</span></div>`;

export const nebSheetHtml = (data: ReportCard, logoSrc: string | null): string => {
  const options = nebOptions(data.layout);
  const { school, examination, student, subjects = [], summary, remarks } = data;
  const bands = data.gradeReference?.length ? data.gradeReference : undefined;

  const totalCreditHours = subjects.reduce(
    (acc, s) => acc + (Number(s.theoryCreditHours) || 0) + (Number(s.internalCreditHours) || 0),
    0,
  );

  const contactLine = [
    school.landlineNumber && `Ph: ${school.landlineNumber}`,
    school.phone,
    school.email && `Email: ${school.email}`,
  ]
    .filter(Boolean)
    .join(", ");

  const rows = subjects
    .map((s, index) => {
      const remark = remarkForGrade(s.finalGrade, bands);
      const span = s.hasPractical ? 2 : 1;
      const ab = (v: string) => (s.isAbsent ? "AB" : v);
      const theory = `<tr class="theory-row">
<td rowspan="${span}" class="center sn-cell">${index + 1}</td>
<td class="subject-name">${esc(s.subjectName)} (TH)</td>
<td class="center">${esc(s.theoryCreditHours || "—")}</td>
<td class="center">${esc(ab(fixed(s.theoryGpa, 1)))}</td>
<td class="center">${esc(ab(s.theoryGrade || "—"))}</td>
<td rowspan="${span}" class="center bold fg-cell">${esc(s.isAbsent ? "AB" : (s.finalGrade ?? ""))}</td>
<td rowspan="${span}" class="center remarks-cell">${esc(s.isAbsent ? "ABSENT" : remark)}</td>
</tr>`;
      const practical = s.hasPractical
        ? `<tr class="internal-row">
<td class="subject-name">${esc(s.subjectName)} (IN)</td>
<td class="center">${esc(s.internalCreditHours || "—")}</td>
<td class="center">${esc(ab(fixed(s.practicalGpa, 1)))}</td>
<td class="center">${esc(ab(s.practicalGrade || "—"))}</td>
</tr>`
        : "";
      return theory + practical;
    })
    .join("\n");

  const table = `<table class="marks-table">
<thead><tr>
<th class="sn-col">S.N</th><th class="subject-col">SUBJECTS</th><th class="ch-col">CREDIT HOUR<br />(CH)</th>
<th class="gp-col">GRADE POINT<br />(GP)</th><th class="grade-col">GRADE</th><th class="fg-col">FINAL GRADE<br />(FG)</th>
<th class="remarks-col">REMARKS</th>
</tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr class="total-row">
<td colspan="2" class="right bold">TOTAL</td>
<td class="center bold">${esc(totalCreditHours.toFixed(2))}</td>
<td colspan="4" class="center bold">GRADE POINT AVERAGE (GPA): ${esc(fixed(summary.gpa, 2, ""))}</td>
</tr></tfoot>
</table>`;

  const contact = [
    school.landlineNumber ? `Tel: ${esc(school.landlineNumber)}` : "",
    school.landlineNumber && school.phone ? " | " : "",
    school.phone ? `Mobile: ${esc(school.phone)}` : "",
    (school.landlineNumber || school.phone) && school.email ? " | " : "",
    school.email ? `Email: ${esc(school.email)}` : "",
  ].join("");

  const header = `<header class="report-header">
${logoSrc ? `<div class="school-logo"><img src="${esc(logoSrc)}" alt="School Logo" /></div>` : ""}
<div class="school-info">
<h1 class="school-name">${esc(school.name || "School Name")}</h1>
${school.tagline ? `<p class="school-tagline">${esc(school.tagline)}</p>` : ""}
<p class="school-address">${esc(school.address || "School Address")}</p>
<p class="school-contact">${contact}</p>
${school.website ? `<p class="school-website">Website: ${esc(school.website)}</p>` : ""}
</div>
${logoSrc ? `<div class="school-logo-balance" aria-hidden="true"></div>` : ""}
</header>`;

  const attendance = options.showAttendanceStrip
    ? `<section class="attendance-section"><div class="attendance-grid">
<div class="attendance-item"><span class="label">ATTENDANCE:</span><span class="value">${esc(summary.attendancePresent ?? "—")} / ${esc(summary.attendanceTotal ?? "—")}</span></div>
<div class="attendance-item"><span class="label">REMARKS:</span><span class="value">${esc(remarkForGrade(summary.grade, bands) || "—")}</span></div>
</div></section>`
    : "";

  const summaryGrid = options.showSummaryGrid
    ? `<section class="summary-section"><div class="summary-grid">
${info("Total Subjects:", summary.totalSubjects || 0)}
${info("Subjects Passed:", summary.passedSubjects || 0)}
${info("Subjects Failed:", summary.failedSubjects || 0)}
${info("Class Rank:", summary.classRank || "N/A")}
<div class="summary-item highlight"><span class="label">Final GPA:</span><span class="value large">${esc(fixed(summary.gpa, 2, ""))}</span></div>
<div class="summary-item highlight"><span class="label">Result:</span><span class="value large">${esc(summary.resultStatus || (summary.isPassed ? "PASSED" : "FAILED"))}</span></div>
</div></section>`
    : "";

  const remarksHtml =
    options.showRemarks && (remarks.teacher || remarks.principal)
      ? `<section class="remarks-section">
${remarks.teacher ? `<div class="remark-item"><span class="label">Class Teacher&apos;s Remarks:</span><span class="value">${esc(remarks.teacher)}</span></div>` : ""}
${remarks.principal ? `<div class="remark-item"><span class="label">Principal&apos;s Remarks:</span><span class="value">${esc(remarks.principal)}</span></div>` : ""}
</section>`
      : "";

  const signatures = `<section class="signature-section">
<div class="signature-grid" style="grid-template-columns: repeat(${Math.max(1, options.signatures.length)}, 1fr)">
${options.signatures.map((l) => `<div class="signature-item"><div class="signature-line"></div><span class="signature-label">${esc(l)}</span></div>`).join("")}
</div>
<div class="issue-date"><span>Date of Issue: ${esc(examination.academicYearBS || "_______________")}</span></div>
</section>`;

  const footer = `<footer class="report-footer">${
    options.footerText
      ? `<p class="contact-info" style="white-space: pre-line; text-align: left">${esc(options.footerText)}</p>`
      : `<p class="contact-info">${esc(contactLine)}</p>`
  }</footer>`;

  return `<div class="report-card-a4" style="${esc(designStyle(data.layout?.design))}">
<div class="rc-fit"><div class="rc-fit-inner">
${header}
<div class="report-title"><h2>${esc(options.reportTitle)}</h2><h3>${esc(examination.name || "Examination")}</h3>
<p class="academic-year">Academic Year: ${esc(examination.academicYear || "N/A")}</p></div>
<section class="student-info-section"><div class="info-grid">
${info("Student Name:", student.name || "N/A")}
${info("Roll No:", student.rollNumber || "N/A")}
${info("Class:", student.class || "N/A")}
${info("Section:", student.section || "N/A")}
${student.admissionNumber ? info("Admission No:", student.admissionNumber) : ""}
</div></section>
<section class="marks-section">${table}</section>
${options.showGradeLegend ? gradeLegendHtml(bands) : ""}
${attendance}
${summaryGrid}
${remarksHtml}
${signatures}
${footer}
</div></div>
</div>`;
};
