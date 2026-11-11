import React, { useRef, useState } from "react";
import { remarkForGrade } from "../../../utils/grades";
import { resolveAssetUrl } from "../../../utils/assets";
import { SHEET_OPTIONS, layoutOptions } from "./variants";
import useFitToPage from "./useFitToPage";
import PerformanceSheet from "./PerformanceSheet";
import GradeLegend from "./GradeLegend";

/**
 * The marksheet itself — one student, one A4 sheet.
 *
 * This is the single source of truth for report-card markup. It used to exist
 * twice (NepalReportCard and a private SingleReportCard inside
 * BulkReportCardPrint), and the two copies had already drifted apart: different
 * remark wording, different credit-hour sums, different section sets. Any change
 * to the sheet belongs here.
 *
 * Contract: `data` is one element of the `getBulkReportCards` payload, which is
 * byte-identical to what `getReportCard` returns:
 *   { school, examination, student, subjects, summary, remarks, meta, gradeReference }
 *
 * One design: individual and bulk print render this same sheet with the same
 * options (variants.js SHEET_OPTIONS) and the same stylesheet
 * (nebSheetStyles.js). Bulk is simply one sheet per page.
 *
 * Per-school layout: the payload's `layout` (School Settings -> Report Card)
 * either switches to the Performance Report template, or adjusts the NEB-sheet
 * settings mapped in variants.js `layoutOptions`.
 *
 * One page: useFitToPage zooms the content down when it would not fit an A4
 * page (many subjects, long names), the same way for every caller.
 */

const InfoItem = ({ label, value, wrapValue }) => (
  <div className="info-item">
    <span className="label">{label}</span>
    {wrapValue ? <span className="value">{value}</span> : <span>{value}</span>}
  </div>
);

const ReportSheet = ({ data, compact = false, options, onLogoError, logoError = false }) => {
  if (!data) return null;

  if (data.layout?.template === "performanceReport") {
    return (
      <PerformanceSheet
        data={data}
        compact={compact}
        logoError={logoError}
        onLogoError={onLogoError}
      />
    );
  }

  return <NebSheet data={data} options={options} />;
};

/** The NEB grade sheet: one student, one A4 page. */
const NebSheet = ({ data, options: overrides }) => {
  const fitRef = useRef(null);
  const [logoFailed, setLogoFailed] = useState(false);

  const options = {
    ...SHEET_OPTIONS,
    ...layoutOptions(data.layout),
    ...overrides,
  };
  const { school, examination, student, subjects, summary, remarks, gradeReference } =
    data;

  // Remark wording comes from the scale this card was graded on, so a legacy
  // "D+" or "E" gets its own description instead of a blank.
  const bands = gradeReference?.length ? gradeReference : undefined;

  // Credit hours shown in the table footer: theory + internal across all subjects.
  const totalCreditHours =
    subjects?.reduce(
      (acc, s) =>
        acc +
        (parseFloat(s.theoryCreditHours) || 0) +
        (parseFloat(s.internalCreditHours) || 0),
      0
    ) || 0;

  const logoUrl = logoFailed ? null : school?.logoUrl || (options.showEmblem ? school?.bannerUrl : null);

  const contactLine = [
    school?.landlineNumber && `Ph: ${school.landlineNumber}`,
    school?.phone,
    school?.email && `Email: ${school.email}`,
  ]
    .filter(Boolean)
    .join(", ");

  const rows = subjects?.map((subject, index) => {
    const remarkText = remarkForGrade(subject.finalGrade, bands);
    const span = subject.hasPractical ? 2 : 1;
    const theoryRow = (
      <tr className="theory-row">
        <td rowSpan={span} className="center sn-cell">
          {index + 1}
        </td>
        <td className="subject-name">{subject.subjectName} (TH)</td>
        <td className="center">{subject.theoryCreditHours || "—"}</td>
        <td className="center">
          {subject.isAbsent ? "AB" : subject.theoryGpa?.toFixed(1) || "—"}
        </td>
        <td className="center">
          {subject.isAbsent ? "AB" : subject.theoryGrade || "—"}
        </td>
        <td rowSpan={span} className="center bold fg-cell">
          {subject.isAbsent ? "AB" : subject.finalGrade}
        </td>
        <td rowSpan={span} className="center remarks-cell">
          {subject.isAbsent ? "ABSENT" : remarkText}
        </td>
      </tr>
    );
    const practicalRow = subject.hasPractical && (
      <tr className="internal-row">
        <td className="subject-name">{subject.subjectName} (IN)</td>
        <td className="center">{subject.internalCreditHours || "—"}</td>
        <td className="center">
          {subject.isAbsent ? "AB" : subject.practicalGpa?.toFixed(1) || "—"}
        </td>
        <td className="center">
          {subject.isAbsent ? "AB" : subject.practicalGrade || "—"}
        </td>
      </tr>
    );
    const key = subject.subjectId || index;

    return (
      <React.Fragment key={key}>
        {theoryRow}
        {practicalRow}
      </React.Fragment>
    );
  });

  const table = (
    <table className="marks-table">
      <thead>
        <tr>
          <th className="sn-col">S.N</th>
          <th className="subject-col">SUBJECTS</th>
          <th className="ch-col">
            CREDIT HOUR
            <br />
            (CH)
          </th>
          <th className="gp-col">
            GRADE POINT
            <br />
            (GP)
          </th>
          <th className="grade-col">GRADE</th>
          <th className="fg-col">
            FINAL GRADE
            <br />
            (FG)
          </th>
          <th className="remarks-col">REMARKS</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
      <tfoot>
        <tr className="total-row">
          <td colSpan="2" className="right bold">
            TOTAL
          </td>
          <td className="center bold">{totalCreditHours.toFixed(2)}</td>
          <td colSpan="4" className="center bold">
            GRADE POINT AVERAGE (GPA): {summary?.gpa?.toFixed(2)}
          </td>
        </tr>
      </tfoot>
    </table>
  );

  useFitToPage(fitRef, [data, options.showGradeLegend, options.showSummaryGrid, options.showRemarks, options.showAttendanceStrip, options.footerText, logoFailed]);

  return (
    <div className="report-card-a4">
      <div className="rc-fit" ref={fitRef}>
      <div className="rc-fit-inner">
      {/* Header */}
        <header className="report-header">
          <div className="school-logo">
            {logoUrl ? (
              <img
                src={resolveAssetUrl(logoUrl)}
                alt="School Logo"
                crossOrigin="anonymous"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <div className="logo-placeholder">
                <span>🏫</span>
              </div>
            )}
          </div>
          <div className="school-info">
            <h1 className="school-name">{school?.name || "School Name"}</h1>
            {school?.tagline && <p className="school-tagline">{school.tagline}</p>}
            <p className="school-address">{school?.address || "School Address"}</p>
            <p className="school-contact">
              {school?.landlineNumber && `Tel: ${school.landlineNumber}`}
              {school?.landlineNumber && school?.phone && " | "}
              {school?.phone && `Mobile: ${school.phone}`}
              {(school?.landlineNumber || school?.phone) && school?.email && " | "}
              {school?.email && `Email: ${school.email}`}
            </p>
            {school?.website && (
              <p className="school-website">Website: {school.website}</p>
            )}
          </div>
          {options.showEmblem && (
            <div className="school-logo right-logo">
              <div className="logo-placeholder nepal-emblem">
                <span>🇳🇵</span>
              </div>
            </div>
          )}
        </header>

      {/* Report title */}
      {(
        <div className="report-title">
          <h2>{options.reportTitle}</h2>
          <h3>{examination?.name || "Examination"}</h3>
          <p className="academic-year">
            Academic Year: {examination?.academicYear || "N/A"}
          </p>
        </div>
      )}

      {/* Student information */}
      <section className="student-info-section">
        <div className="info-grid">
          <InfoItem
            label="Student Name:"
            value={student?.name || "N/A"}
            wrapValue
          />
          <InfoItem
            label="Roll No:"
            value={student?.rollNumber || "N/A"}
            wrapValue
          />
          <InfoItem
            label="Class:"
            value={student?.class || "N/A"}
            wrapValue
          />
          <InfoItem
            label="Section:"
            value={student?.section || "N/A"}
            wrapValue
          />
          {student?.admissionNumber && (
            <InfoItem
              label="Admission No:"
              value={student.admissionNumber}
              wrapValue
            />
          )}
        </div>
      </section>

      {/* Marks */}
      <section className="marks-section">{table}</section>

      {options.showGradeLegend && <GradeLegend bands={bands} />}

      {/* Attendance strip */}
      {options.showAttendanceStrip && (
        <section className="attendance-section">
          <div className="attendance-grid">
            <div className="attendance-item">
              <span className="label">ATTENDANCE:</span>
              <span className="value">
                {summary?.attendancePresent ?? "—"} /{" "}
                {summary?.attendanceTotal ?? "—"}
              </span>
            </div>
            <div className="attendance-item">
              <span className="label">REMARKS:</span>
              <span className="value">
                {remarkForGrade(summary?.grade, bands) || "—"}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Summary grid */}
      {options.showSummaryGrid && (
        <section className="summary-section">
          <div className="summary-grid">
            <InfoItem
              label="Total Subjects:"
              value={summary?.totalSubjects || 0}
              wrapValue
            />
            <InfoItem
              label="Subjects Passed:"
              value={summary?.passedSubjects || 0}
              wrapValue
            />
            <InfoItem
              label="Subjects Failed:"
              value={summary?.failedSubjects || 0}
              wrapValue
            />
            <InfoItem
              label="Class Rank:"
              value={summary?.classRank || "N/A"}
              wrapValue
            />
            <div className="summary-item highlight">
              <span className="label">Final GPA:</span>
              <span className="value large">{summary?.gpa?.toFixed(2)}</span>
            </div>
            <div className="summary-item highlight">
              <span className="label">Result:</span>
              <span className="value large">
                {summary?.resultStatus ||
                  (summary?.isPassed ? "PASSED" : "FAILED")}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Teacher / principal remarks */}
      {options.showRemarks && (remarks?.teacher || remarks?.principal) && (
        <section className="remarks-section">
          {remarks?.teacher && (
            <div className="remark-item">
              <span className="label">Class Teacher&apos;s Remarks:</span>
              <span className="value">{remarks.teacher}</span>
            </div>
          )}
          {remarks?.principal && (
            <div className="remark-item">
              <span className="label">Principal&apos;s Remarks:</span>
              <span className="value">{remarks.principal}</span>
            </div>
          )}
        </section>
      )}

      {/* Signatures */}
      <section className="signature-section">
        <div
          className="signature-grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, options.signatures.length)}, 1fr)`,
          }}
        >
          {options.signatures.map((label, i) => (
            <div className="signature-item" key={`${label}-${i}`}>
              <div className="signature-line"></div>
              <span className="signature-label">{label}</span>
            </div>
          ))}
        </div>
        <div className="issue-date">
          <span>Date of Issue: {examination?.academicYearBS || "_______________"}</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="report-footer">
        {options.footerText ? (
          <p className="contact-info" style={{ whiteSpace: "pre-line", textAlign: "left" }}>
            {options.footerText}
          </p>
        ) : (
          <p className="contact-info">{contactLine}</p>
        )}
      </footer>
      </div>
      </div>
    </div>
  );
};


export default ReportSheet;
