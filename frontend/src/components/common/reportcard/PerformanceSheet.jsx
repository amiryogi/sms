import React from "react";
import { remarkForGrade } from "../../../utils/grades";
import { resolveAssetUrl } from "../../../utils/assets";
import GradeLegend from "./GradeLegend";

/**
 * The "Performance Report" template: one row per subject, as on the SVI sample
 * sheets (marksheetformat1-4.jpeg). Every setting in the school's layout
 * applies here; see backend/src/utils/reportCardLayout.js.
 *
 * Rendered by ReportSheet when `data.layout.template === "performanceReport"`,
 * for the single card, the student and parent pages, bulk print and the
 * settings preview alike. Styles are scoped under `.perf-sheet` so they cannot
 * collide with the NEB sheet's global classes.
 */

const dash = "—";

const PerformanceSheet = ({ data, compact = false, logoError = false, onLogoError }) => {
  const { school, examination, student, subjects = [], summary, remarks, meta, gradeReference, layout } =
    data;

  const bands = gradeReference?.length ? gradeReference : undefined;
  const showGrades = layout.mode !== "marks";
  const showMarks = layout.mode !== "grades";
  // "auto" splits only when some subject on this card has a practical, which
  // is the backend's flag, not a guess from subject names.
  const split =
    layout.theoryPracticalSplit === "always" ||
    (layout.theoryPracticalSplit === "auto" && subjects.some((s) => s.hasPractical));
  const showRemark = layout.remarkColumn !== "hidden";
  const twoHeaderRows = split;

  const classLabel =
    (layout.classNameStyle === "wordAndNumeral" && student?.classWithNumeral) ||
    student?.class ||
    dash;
  const studentCode =
    layout.studentCodeField === "admissionNumber" ? student?.admissionNumber : null;
  const yearLine =
    examination?.yearBS && examination?.yearAD
      ? `${examination.yearBS} (${examination.yearAD})`
      : examination?.academicYear || "";

  const logoUrl = school?.logoUrl && !logoError ? resolveAssetUrl(school.logoUrl) : null;

  const cell = (subject, value) => (subject.isAbsent ? "AB" : value ?? dash);
  const gp = (v) => (typeof v === "number" ? v.toFixed(1) : dash);

  // Column counts, for the filler row and the marks total row.
  const leadColumnCount =
    1 + (layout.showSubjectCode ? 1 : 0) + (layout.showCreditHours ? 1 : 0);
  const marksColumnCount = showMarks ? 1 + (split ? 3 : 1) : 0;
  // Obtained grade(s), final grade, grade point, remark.
  const gradeColumnCount =
    (showGrades ? (split ? 2 : 1) : 0) + 2 + (showRemark ? 1 : 0);
  const columnCount = leadColumnCount + marksColumnCount + gradeColumnCount;

  const fillerRows = Math.max(0, (layout.minTableRows || 0) - subjects.length);

  const rowSpan = twoHeaderRows ? 2 : undefined;

  // Signature row: the seal and issue date sit in the middle, as on the samples.
  const signatures = layout.signatures || [];
  const middle = Math.ceil(signatures.length / 2);
  const lastIndex = signatures.length - 1;
  const signatureBlock = (label, i) => (
    <div className="perf-sign" key={`sig-${i}`}>
      {layout.showPrincipalName && i === lastIndex && school?.principalName && (
        <div className="perf-sign-name">{school.principalName}</div>
      )}
      <div className="perf-sign-line" />
      <div className="perf-sign-label">{label}</div>
    </div>
  );
  const centerBlock = (
    <div className="perf-sign perf-sign-center" key="center">
      {layout.showSeal && <div className="perf-seal">Seal</div>}
      <div className="perf-issue">Date of Issue: {meta?.issueDateBS || "____________"}</div>
    </div>
  );
  const signatureRow = [
    ...signatures.slice(0, middle).map((l, i) => signatureBlock(l, i)),
    centerBlock,
    ...signatures.slice(middle).map((l, i) => signatureBlock(l, i + middle)),
  ];

  return (
    <div className={`perf-sheet${compact ? " compact" : ""}`}>
      {layout.showWatermark && logoUrl && (
        <img className="perf-watermark" src={logoUrl} alt="" aria-hidden="true" crossOrigin="anonymous" />
      )}

      <header className="perf-header">
        <div className="perf-logo">
          {logoUrl ? (
            <img src={logoUrl} alt="School logo" crossOrigin="anonymous" onError={onLogoError} />
          ) : null}
        </div>
        <div className="perf-school">
          <h1>{school?.name || "School Name"}</h1>
          {school?.address && <p>{school.address}</p>}
        </div>
        <div className="perf-logo" aria-hidden="true" />
      </header>

      <div className="perf-title">
        <h2>{layout.title}</h2>
        {yearLine && <p>Academic Year {yearLine}</p>}
      </div>

      <div className="perf-student">
        <div className="perf-student-line">
          <span className="perf-label">Name:</span>
          <span className="perf-name">{student?.name || dash}</span>
          {studentCode && <span className="perf-code">[{studentCode}]</span>}
        </div>
        <div className="perf-student-line perf-spread">
          <span>
            <span className="perf-label">Class:</span> {classLabel}
          </span>
          <span>
            <span className="perf-label">Sec:</span> {student?.section || dash}
          </span>
          <span>
            <span className="perf-label">Roll No.:</span> {student?.rollNumber ?? dash}
          </span>
        </div>
      </div>

      <div className="perf-exam">
        <span>{examination?.name || "Examination"}</span>
      </div>

      <table className={`perf-table${columnCount > 8 ? " wide" : ""}`}>
        <thead>
          <tr>
            <th rowSpan={rowSpan} className="col-subject">SUBJECTS</th>
            {layout.showSubjectCode && <th rowSpan={rowSpan}>CODE</th>}
            {layout.showCreditHours && (
              <th rowSpan={rowSpan}>
                CREDIT
                <br />
                HOUR
              </th>
            )}
            {showMarks && (
              <>
                <th rowSpan={rowSpan}>
                  FULL
                  <br />
                  MARKS
                </th>
                <th colSpan={split ? 3 : 1} rowSpan={split ? undefined : rowSpan}>
                  OBTAINED
                  {split ? " " : <br />}
                  MARKS
                </th>
              </>
            )}
            {showGrades && (
              <th colSpan={split ? 2 : 1} rowSpan={split ? undefined : rowSpan}>
                OBTAINED
                {split ? " " : <br />}
                GRADE
              </th>
            )}
            <th rowSpan={rowSpan}>
              FINAL
              <br />
              GRADE
            </th>
            <th rowSpan={rowSpan}>
              GRADE
              <br />
              POINT
            </th>
            {showRemark && (
              <th rowSpan={rowSpan} className="col-remark">
                REMARK
              </th>
            )}
          </tr>
          {twoHeaderRows && (
            <tr>
              {showMarks && (
                <>
                  <th>THEORY</th>
                  <th>PRACTICAL</th>
                  <th>TOTAL</th>
                </>
              )}
              {showGrades && (
                <>
                  <th>THEORY</th>
                  <th>PRACTICAL</th>
                </>
              )}
            </tr>
          )}
        </thead>
        <tbody>
          {subjects.map((s, index) => (
            <tr key={s.subjectId ?? index}>
              <td className="col-subject">{s.subjectName}</td>
              {layout.showSubjectCode && <td>{s.subjectCode || dash}</td>}
              {layout.showCreditHours && <td>{s.creditHours ?? dash}</td>}
              {showMarks && (
                <>
                  <td>{s.totalFullMarks ?? dash}</td>
                  {split && <td>{cell(s, s.theoryMarks)}</td>}
                  {split && <td>{s.hasPractical ? cell(s, s.practicalMarks) : dash}</td>}
                  <td>{cell(s, s.totalMarks)}</td>
                </>
              )}
              {showGrades &&
                (split ? (
                  <>
                    <td>{cell(s, s.theoryGrade)}</td>
                    <td>{s.hasPractical ? cell(s, s.practicalGrade) : dash}</td>
                  </>
                ) : (
                  <td>{cell(s, s.finalGrade)}</td>
                ))}
              <td>{cell(s, s.finalGrade)}</td>
              <td>{s.isAbsent ? dash : gp(s.finalGpa)}</td>
              {showRemark && (
                <td className="col-remark">
                  {layout.remarkColumn === "description"
                    ? s.isAbsent
                      ? "Absent"
                      : remarkForGrade(s.finalGrade, bands)
                    : ""}
                </td>
              )}
            </tr>
          ))}
          {fillerRows > 0 && (
            <tr className="perf-filler" style={{ height: `${fillerRows * 1.75}em` }}>
              {Array.from({ length: columnCount }, (_, i) => (
                <td key={i} />
              ))}
            </tr>
          )}
        </tbody>
        {showMarks && (
          <tfoot>
            <tr>
              <td className="col-subject">TOTAL</td>
              {layout.showSubjectCode && <td />}
              {layout.showCreditHours && <td />}
              <td>{summary?.totalFullMarks ?? dash}</td>
              {split && <td />}
              {split && <td />}
              <td>{summary?.totalMarks ?? dash}</td>
              <td colSpan={gradeColumnCount} />
            </tr>
          </tfoot>
        )}
      </table>

      <div className="perf-after-table">
        <div>
          {layout.showAttendance && (
            <table className="perf-attendance">
              <tbody>
                <tr>
                  <td>ATTENDANCE</td>
                  <td>
                    {summary?.attendancePresent ?? dash}/{summary?.attendanceTotal ?? dash}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <div className="perf-totals">
          <div>
            GRADE POINT AVERAGE (GPA):{" "}
            <strong>{typeof summary?.gpa === "number" ? summary.gpa.toFixed(2) : dash}</strong>
          </div>
          {layout.showPercentage && (
            <div>
              PERCENTAGE:{" "}
              <strong>
                {typeof summary?.percentage === "number" ? `${summary.percentage.toFixed(2)}%` : dash}
              </strong>
            </div>
          )}
          {layout.showRank && (
            <div>
              CLASS RANK: <strong>{summary?.classRank ?? dash}</strong>
            </div>
          )}
          {layout.showResult && (
            <div>
              RESULT: <strong>{summary?.resultStatus || (summary?.isPassed ? "PASSED" : "FAILED")}</strong>
            </div>
          )}
        </div>
      </div>

      {layout.showSummaryGrid && (
        <div className="perf-summary">
          <span>Subjects: {summary?.totalSubjects ?? 0}</span>
          <span>Passed: {summary?.passedSubjects ?? 0}</span>
          <span>Failed: {summary?.failedSubjects ?? 0}</span>
          <span>Overall grade: {summary?.grade || dash}</span>
        </div>
      )}

      {layout.showGradeLegend && <GradeLegend bands={bands} />}

      {layout.showTeacherRemarks && (remarks?.teacher || remarks?.principal) && (
        <div className="perf-remarks">
          {remarks?.teacher && (
            <p>
              <span className="perf-label">Class Teacher&apos;s Remarks:</span> {remarks.teacher}
            </p>
          )}
          {remarks?.principal && (
            <p>
              <span className="perf-label">Principal&apos;s Remarks:</span> {remarks.principal}
            </p>
          )}
        </div>
      )}

      <div className="perf-spacer" />

      <div className="perf-signatures">{signatureRow}</div>

      {layout.footerText && <footer className="perf-footer">{layout.footerText}</footer>}

      <style>{PERF_STYLES}</style>
    </div>
  );
};

const PERF_STYLES = `
  .perf-sheet {
    position: relative;
    width: 210mm;
    min-height: 297mm;
    padding: 14mm 16mm 10mm;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background: #fff;
    color: #000;
    font-family: 'Book Antiqua', Palatino, 'Palatino Linotype', 'Times New Roman', serif;
    font-size: 10.5pt;
    line-height: 1.3;
    overflow: hidden;
    margin: 0 auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  }
  /* index.css sets Inter on every element with "*", which beats inheritance. */
  .perf-sheet,
  .perf-sheet * {
    font-family: 'Book Antiqua', Palatino, 'Palatino Linotype', 'Times New Roman', serif;
  }
  .perf-sheet > * { position: relative; z-index: 1; }
  .perf-sheet .perf-watermark {
    position: absolute;
    z-index: 0;
    top: 50%;
    left: 50%;
    width: 60%;
    transform: translate(-50%, -45%);
    opacity: 0.07;
    pointer-events: none;
  }

  .perf-header {
    display: grid;
    grid-template-columns: 28mm 1fr 28mm;
    align-items: center;
  }
  .perf-logo { width: 26mm; height: 26mm; }
  .perf-logo img { width: 100%; height: 100%; object-fit: contain; }
  .perf-school { text-align: center; }
  .perf-school h1 { margin: 0; font-size: 21pt; font-weight: normal; letter-spacing: 0.3px; line-height: 1.15; }
  .perf-school p { margin: 4px 0 0; font-size: 13pt; }

  .perf-title { text-align: center; margin: 9mm 0 4mm; }
  .perf-title h2 { margin: 0; font-size: 15pt; font-weight: bold; }
  .perf-title p { margin: 2px 0 0; font-size: 11pt; }

  .perf-student { font-size: 10.5pt; }
  .perf-student-line { display: flex; gap: 10px; align-items: baseline; margin: 2px 0; }
  .perf-spread { justify-content: space-between; }
  .perf-label { font-weight: bold; margin-right: 6px; }
  .perf-name { text-transform: uppercase; margin-left: 12px; }
  .perf-code { margin-left: 18px; }

  .perf-exam { text-align: center; margin: 4mm 0 3mm; }
  .perf-exam span {
    display: inline-block;
    border: 1px solid #000;
    padding: 2px 22px;
    font-weight: bold;
    font-size: 10pt;
  }

  .perf-table {
    width: 100%;
    border-collapse: collapse;
    border: 1.5px solid #000;
    font-size: 10pt;
  }
  .perf-table th {
    border: 1px solid #000;
    padding: 3px 4px;
    font-weight: normal;
    font-size: 9.5pt;
    text-align: center;
    vertical-align: middle;
    background: #fff;
  }
  .perf-table td {
    border-left: 1px solid #000;
    border-right: 1px solid #000;
    padding: 2px 6px;
    text-align: center;
    height: 1.75em;
  }
  .perf-table td.col-subject { text-align: left; }
  .perf-table th.col-subject { width: 38%; }
  .perf-table .col-remark { width: 15%; text-align: left; font-size: 9pt; }
  .perf-table tbody tr:first-child td { padding-top: 4px; }
  .perf-table .perf-filler td { height: auto; }
  .perf-table tfoot td { border-top: 1px solid #000; font-weight: bold; }

  .perf-after-table {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 3mm;
    font-weight: bold;
  }
  .perf-attendance { border-collapse: collapse; min-width: 85mm; }
  .perf-attendance td { border: 1px solid #000; padding: 1px 10px; text-align: center; }
  .perf-attendance td:first-child { width: 60%; }
  .perf-totals { text-align: right; }
  .perf-totals > div { margin-bottom: 2px; }

  .perf-summary {
    display: flex;
    gap: 18px;
    margin-top: 3mm;
    padding: 3px 6px;
    border: 1px solid #000;
    font-size: 9.5pt;
  }
  .perf-remarks { margin-top: 3mm; font-size: 10pt; }
  .perf-remarks p { margin: 2px 0; }

  .perf-spacer { flex: 1; min-height: 8mm; }

  .perf-signatures {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 8mm;
    font-size: 9.5pt;
  }
  .perf-sign { text-align: center; min-width: 42mm; }
  .perf-sign-name { font-weight: bold; }
  .perf-sign-line { border-top: 1px solid #000; margin-bottom: 2px; }
  .perf-sign-center { min-width: 0; }
  .perf-sign-center .perf-seal { margin-bottom: 10mm; }

  .perf-footer {
    margin-top: 3mm;
    padding-top: 2px;
    border-top: 1px solid #000;
    font-size: 9pt;
    white-space: pre-line;
  }

  /* Many columns (marks and grades, codes, credit hours): smaller type so
     the table stays inside the page. */
  .perf-table.wide { font-size: 8.5pt; table-layout: auto; }
  .perf-table.wide th { font-size: 7.5pt; padding: 2px 2px; }
  .perf-table.wide td { padding: 2px 3px; }
  .perf-table.wide th.col-subject { width: auto; }
  .perf-table.wide .col-remark { width: auto; font-size: 7.5pt; }

  /* Bulk print with many subjects */
  .perf-sheet.compact { font-size: 9.5pt; padding-top: 10mm; }
  .perf-sheet.compact .perf-title { margin: 5mm 0 3mm; }
  .perf-sheet.compact .perf-table td { height: 1.5em; }

  @media print {
    .perf-sheet {
      box-shadow: none !important;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    /* Bulk print: @page margin is 0, one sheet per page. */
    .report-card-page .perf-sheet {
      width: 210mm;
      height: 297mm;
      min-height: 0;
    }
    /* Single card / student / parent: @page margin is 8mm. */
    .report-card-container .perf-sheet {
      width: 100%;
      height: 279mm;
      min-height: 0;
      padding: 6mm 8mm 2mm;
    }
  }
`;

export default PerformanceSheet;
