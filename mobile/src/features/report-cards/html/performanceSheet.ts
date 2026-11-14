/**
 * The "Performance Report" template as HTML: a port of the web's
 * reportcard/PerformanceSheet.jsx (one row per subject, the school's layout
 * switches). Same classes as the web, styled by PERF_SHEET_CSS. Keep in step.
 */
import type { ReportCard, SubjectResult } from "@/types/api";
import { esc, gradeLegendHtml, remarkForGrade } from "./common";

const dash = "—";

export const performanceSheetHtml = (data: ReportCard, logoSrc: string | null): string => {
  const { school, examination, student, subjects = [], summary, remarks, meta, layout } = data;
  const bands = data.gradeReference?.length ? data.gradeReference : undefined;

  const showGrades = layout.mode !== "marks";
  const showMarks = layout.mode !== "grades";
  // "auto" splits only when a subject on this card has a practical (the backend's flag).
  const split = layout.theoryPracticalSplit === "always" || (layout.theoryPracticalSplit === "auto" && subjects.some((s) => s.hasPractical));
  const showRemark = layout.remarkColumn !== "hidden";
  const rowSpan = split ? ` rowspan="2"` : "";

  const classLabel = (layout.classNameStyle === "wordAndNumeral" && student.classWithNumeral) || student.class || dash;
  const studentCode = layout.studentCodeField === "admissionNumber" ? student.admissionNumber : null;
  const yearLine = examination.yearBS && examination.yearAD ? `${examination.yearBS} (${examination.yearAD})` : examination.academicYear || "";

  const cell = (s: SubjectResult, value: unknown) => esc(s.isAbsent ? "AB" : (value ?? dash));
  const gp = (v: unknown) => (typeof v === "number" ? v.toFixed(1) : dash);

  const leadColumnCount = 1 + (layout.showSubjectCode ? 1 : 0) + (layout.showCreditHours ? 1 : 0);
  const marksColumnCount = showMarks ? 1 + (split ? 3 : 1) : 0;
  const gradeColumnCount = (showGrades ? (split ? 2 : 1) : 0) + 2 + (showRemark ? 1 : 0);
  const columnCount = leadColumnCount + marksColumnCount + gradeColumnCount;
  const fillerRows = Math.max(0, (layout.minTableRows || 0) - subjects.length);

  const head1 = [
    `<th${rowSpan} class="col-subject">SUBJECTS</th>`,
    layout.showSubjectCode ? `<th${rowSpan}>CODE</th>` : "",
    layout.showCreditHours ? `<th${rowSpan}>CREDIT<br />HOUR</th>` : "",
    showMarks
      ? `<th${rowSpan}>FULL<br />MARKS</th><th colspan="${split ? 3 : 1}"${split ? "" : rowSpan}>OBTAINED${split ? " " : "<br />"}MARKS</th>`
      : "",
    showGrades ? `<th colspan="${split ? 2 : 1}"${split ? "" : rowSpan}>OBTAINED${split ? " " : "<br />"}GRADE</th>` : "",
    `<th${rowSpan}>FINAL<br />GRADE</th>`,
    `<th${rowSpan}>GRADE<br />POINT</th>`,
    showRemark ? `<th${rowSpan} class="col-remark">REMARK</th>` : "",
  ].join("");
  const head2 = split
    ? `<tr>${showMarks ? "<th>THEORY</th><th>PRACTICAL</th><th>TOTAL</th>" : ""}${showGrades ? "<th>THEORY</th><th>PRACTICAL</th>" : ""}</tr>`
    : "";

  const body = subjects
    .map((s) => {
      const tds = [
        `<td class="col-subject">${esc(s.subjectName)}</td>`,
        layout.showSubjectCode ? `<td>${esc(s.subjectCode || dash)}</td>` : "",
        layout.showCreditHours ? `<td>${esc(s.creditHours ?? dash)}</td>` : "",
        showMarks
          ? [
              `<td>${esc(s.totalFullMarks ?? dash)}</td>`,
              split ? `<td>${cell(s, s.theoryMarks)}</td>` : "",
              split ? `<td>${s.hasPractical ? cell(s, s.practicalMarks) : dash}</td>` : "",
              `<td>${cell(s, s.totalMarks)}</td>`,
            ].join("")
          : "",
        showGrades
          ? split
            ? `<td>${cell(s, s.theoryGrade)}</td><td>${s.hasPractical ? cell(s, s.practicalGrade) : dash}</td>`
            : `<td>${cell(s, s.finalGrade)}</td>`
          : "",
        `<td>${cell(s, s.finalGrade)}</td>`,
        `<td>${s.isAbsent ? dash : gp(s.finalGpa)}</td>`,
        showRemark
          ? `<td class="col-remark">${layout.remarkColumn === "description" ? esc(s.isAbsent ? "Absent" : remarkForGrade(s.finalGrade, bands)) : ""}</td>`
          : "",
      ];
      return `<tr>${tds.join("")}</tr>`;
    })
    .join("\n");

  const filler =
    fillerRows > 0 ? `<tr class="perf-filler" style="height: ${fillerRows * 1.75}em">${"<td></td>".repeat(columnCount)}</tr>` : "";

  const foot = showMarks
    ? `<tfoot><tr><td class="col-subject">TOTAL</td>${layout.showSubjectCode ? "<td></td>" : ""}${layout.showCreditHours ? "<td></td>" : ""}<td>${esc(
        summary.totalFullMarks ?? dash,
      )}</td>${split ? "<td></td><td></td>" : ""}<td>${esc(summary.totalMarks ?? dash)}</td><td colspan="${gradeColumnCount}"></td></tr></tfoot>`
    : "";

  // Signatures with the seal and issue date in the middle, as on the samples.
  const signatures = layout.signatures || [];
  const middle = Math.ceil(signatures.length / 2);
  const lastIndex = signatures.length - 1;
  const signatureBlock = (label: string, i: number) =>
    `<div class="perf-sign">${layout.showPrincipalName && i === lastIndex && school.principalName ? `<div class="perf-sign-name">${esc(school.principalName)}</div>` : ""}<div class="perf-sign-line"></div><div class="perf-sign-label">${esc(label)}</div></div>`;
  const centerBlock = `<div class="perf-sign perf-sign-center">${layout.showSeal ? `<div class="perf-seal">Seal</div>` : ""}<div class="perf-issue">Date of Issue: ${esc(meta.issueDateBS || "____________")}</div></div>`;
  const signatureRow = [
    ...signatures.slice(0, middle).map((l, i) => signatureBlock(l, i)),
    centerBlock,
    ...signatures.slice(middle).map((l, i) => signatureBlock(l, i + middle)),
  ].join("");

  const totals = [
    `<div>GRADE POINT AVERAGE (GPA): <strong>${esc(typeof summary.gpa === "number" ? summary.gpa.toFixed(2) : dash)}</strong></div>`,
    layout.showPercentage
      ? `<div>PERCENTAGE: <strong>${esc(typeof summary.percentage === "number" ? `${summary.percentage.toFixed(2)}%` : dash)}</strong></div>`
      : "",
    layout.showRank ? `<div>CLASS RANK: <strong>${esc(summary.classRank ?? dash)}</strong></div>` : "",
    layout.showResult ? `<div>RESULT: <strong>${esc(summary.resultStatus || (summary.isPassed ? "PASSED" : "FAILED"))}</strong></div>` : "",
  ].join("");

  return `<div class="perf-sheet">
${layout.showWatermark && logoSrc ? `<img class="perf-watermark" src="${esc(logoSrc)}" alt="" />` : ""}
<header class="perf-header">
<div class="perf-logo">${logoSrc ? `<img src="${esc(logoSrc)}" alt="School logo" />` : ""}</div>
<div class="perf-school"><h1>${esc(school.name || "School Name")}</h1>${school.address ? `<p>${esc(school.address)}</p>` : ""}</div>
<div class="perf-logo" aria-hidden="true"></div>
</header>
<div class="perf-title"><h2>${esc(layout.title)}</h2>${yearLine ? `<p>Academic Year ${esc(yearLine)}</p>` : ""}</div>
<div class="perf-student">
<div class="perf-student-line"><span class="perf-label">Name:</span><span class="perf-name">${esc(student.name || dash)}</span>${studentCode ? `<span class="perf-code">[${esc(studentCode)}]</span>` : ""}</div>
<div class="perf-student-line perf-spread">
<span><span class="perf-label">Class:</span> ${esc(classLabel)}</span>
<span><span class="perf-label">Sec:</span> ${esc(student.section || dash)}</span>
<span><span class="perf-label">Roll No.:</span> ${esc(student.rollNumber ?? dash)}</span>
</div>
</div>
<div class="perf-exam"><span>${esc(examination.name || "Examination")}</span></div>
<table class="perf-table${columnCount > 8 ? " wide" : ""}">
<thead><tr>${head1}</tr>${head2}</thead>
<tbody>${body}${filler}</tbody>
${foot}
</table>
<div class="perf-after-table">
<div>${layout.showAttendance ? `<table class="perf-attendance"><tbody><tr><td>ATTENDANCE</td><td>${esc(summary.attendancePresent ?? dash)}/${esc(summary.attendanceTotal ?? dash)}</td></tr></tbody></table>` : ""}</div>
<div class="perf-totals">${totals}</div>
</div>
${
  layout.showSummaryGrid
    ? `<div class="perf-summary"><span>Subjects: ${esc(summary.totalSubjects ?? 0)}</span><span>Passed: ${esc(summary.passedSubjects ?? 0)}</span><span>Failed: ${esc(summary.failedSubjects ?? 0)}</span><span>Overall grade: ${esc(summary.grade || dash)}</span></div>`
    : ""
}
${layout.showGradeLegend ? gradeLegendHtml(bands) : ""}
${
  layout.showTeacherRemarks && (remarks.teacher || remarks.principal)
    ? `<div class="perf-remarks">${remarks.teacher ? `<p><span class="perf-label">Class Teacher&apos;s Remarks:</span> ${esc(remarks.teacher)}</p>` : ""}${remarks.principal ? `<p><span class="perf-label">Principal&apos;s Remarks:</span> ${esc(remarks.principal)}</p>` : ""}</div>`
    : ""
}
<div class="perf-spacer"></div>
<div class="perf-signatures">${signatureRow}</div>
${layout.footerText ? `<footer class="perf-footer">${esc(layout.footerText)}</footer>` : ""}
</div>`;
};
