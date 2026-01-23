import React, { useRef } from "react";
import { Printer, Download, X } from "lucide-react";

/**
 * Nepal-style Report Card Component
 * A4 printable format following NEB/Nepal school standards
 *
 * Features:
 * - Official school header with logo
 * - Student information section
 * - Subject-wise marks with theory/practical breakdown (Grade 1-10)
 * - Nepal GPA grading system (A+ to NG)
 * - Grade reference table
 * - Signature sections
 * - Plain black/white print-friendly design
 */

// Resolve asset URLs (handles relative backend paths)
const resolveAssetUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1$/, "")
    : window.location.origin;
  return `${base}/${url.replace(/^\\?/, "").replace(/^\//, "").replace(/\\/g, "/")}`;
};

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Get remark text based on grade
const getRemarkText = (grade) => {
  const remarks = {
    'A+': 'OUTSTANDING',
    'A': 'EXCELLENT',
    'B+': 'VERY GOOD',
    'B': 'GOOD',
    'C+': 'SATISFACTORY',
    'C': 'ACCEPTABLE',
    'D': 'PARTIALLY ACCEPTABLE',
    'NG': 'NOT GRADED'
  };
  return remarks[grade] || '';
};

const NepalReportCard = ({ data, onClose, showActions = true }) => {
  const reportRef = useRef(null);

  if (!data) return null;

  const { school, examination, student, subjects, summary, remarks } = data;

  // Calculate total credit hours from subjects
  const totalCreditHours = subjects?.reduce((acc, s) => 
    acc + (parseFloat(s.theoryCreditHours) || 0) + (parseFloat(s.internalCreditHours) || 0), 0
  ) || 0;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Trigger print dialog for PDF save
    window.print();
  };

  return (
    <div className="report-card-overlay">
      {/* Action Buttons - Hidden during print */}
      {showActions && (
        <div className="report-actions no-print">
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={18} /> Print
          </button>
          <button className="btn btn-secondary" onClick={handleDownload}>
            <Download size={18} /> Download PDF
          </button>
          {onClose && (
            <button className="btn btn-outline" onClick={onClose}>
              <X size={18} /> Close
            </button>
          )}
        </div>
      )}

      {/* Report Card - A4 Format */}
      <div className="report-card-container" ref={reportRef}>
        <div className="report-card-a4">
          {/* Header Section */}
          <header className="report-header">
            <div className="school-logo">
              {(school?.logoUrl || school?.bannerUrl) ? (
                <img src={resolveAssetUrl(school.logoUrl || school.bannerUrl)} alt="School Logo" crossOrigin="anonymous" />
              ) : (
                <div className="logo-placeholder">
                  <span>🏫</span>
                </div>
              )}
            </div>
            <div className="school-info">
              <h1 className="school-name">{school?.name || "School Name"}</h1>
              {school?.tagline && (
                <p className="school-tagline">{school.tagline}</p>
              )}
              <p className="school-address">
                {school?.address || "School Address"}
              </p>
              <p className="school-contact">
                {school?.landlineNumber && `Tel: ${school.landlineNumber}`}
                {school?.landlineNumber && school?.phone && " | "}
                {school?.phone && `Mobile: ${school.phone}`}
                {(school?.landlineNumber || school?.phone) &&
                  school?.email &&
                  " | "}
                {school?.email && `Email: ${school.email}`}
              </p>
              {school?.website && (
                <p className="school-website">Website: {school.website}</p>
              )}
            </div>
            <div className="school-logo right-logo">
              {/* Optional: Second logo or Nepal emblem */}
              <div className="logo-placeholder nepal-emblem">
                <span>🇳🇵</span>
              </div>
            </div>
          </header>

          {/* Report Title */}
          <div className="report-title">
            <h2>GRADE SHEET / REPORT CARD</h2>
            <h3>{examination?.name || "Examination"}</h3>
            <p className="academic-year">
              Academic Year: {examination?.academicYear || "N/A"}
            </p>
          </div>

          {/* Student Information */}
          <section className="student-info-section">
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Student Name:</span>
                <span className="value">{student?.name || "N/A"}</span>
              </div>
              <div className="info-item">
                <span className="label">Roll No:</span>
                <span className="value">{student?.rollNumber || "N/A"}</span>
              </div>
              <div className="info-item">
                <span className="label">Class:</span>
                <span className="value">{student?.class || "N/A"}</span>
              </div>
              <div className="info-item">
                <span className="label">Section:</span>
                <span className="value">{student?.section || "N/A"}</span>
              </div>
              {student?.admissionNumber && (
                <div className="info-item">
                  <span className="label">Admission No:</span>
                  <span className="value">{student.admissionNumber}</span>
                </div>
              )}
            </div>
          </section>

          {/* Marks Table - Row-based format (TH/IN as separate rows) */}
          <section className="marks-section">
            <table className="marks-table">
              <thead>
                <tr>
                  <th className="sn-col">S.N</th>
                  <th className="subject-col">SUBJECTS</th>
                  <th className="ch-col">CREDIT HOUR<br/>(CH)</th>
                  <th className="gp-col">GRADE POINT<br/>(GP)</th>
                  <th className="grade-col">GRADE</th>
                  <th className="fg-col">FINAL GRADE<br/>(FG)</th>
                  <th className="remarks-col">REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {subjects?.map((subject, index) => {
                  const remarkText = getRemarkText(subject.finalGrade);
                  return (
                    <React.Fragment key={subject.subjectId || index}>
                      {/* Theory Row */}
                      <tr className="theory-row">
                        <td rowSpan={subject.hasPractical ? 2 : 1} className="center sn-cell">
                          {index + 1}
                        </td>
                        <td className="subject-name">
                          {subject.subjectName} (TH)
                        </td>
                        <td className="center">
                          {subject.theoryCreditHours || "—"}
                        </td>
                        <td className="center">
                          {subject.isAbsent ? "AB" : (subject.theoryGpa?.toFixed(1) || "—")}
                        </td>
                        <td className="center">
                          {subject.isAbsent ? "AB" : (subject.theoryGrade || "—")}
                        </td>
                        <td rowSpan={subject.hasPractical ? 2 : 1} className="center bold fg-cell">
                          {subject.isAbsent ? "AB" : subject.finalGrade}
                        </td>
                        <td rowSpan={subject.hasPractical ? 2 : 1} className="center remarks-cell">
                          {subject.isAbsent ? "ABSENT" : remarkText}
                        </td>
                      </tr>
                      {/* Internal/Practical Row */}
                      {subject.hasPractical && (
                        <tr className="internal-row">
                          <td className="subject-name">
                            {subject.subjectName} (IN)
                          </td>
                          <td className="center">
                            {subject.internalCreditHours || "—"}
                          </td>
                          <td className="center">
                            {subject.isAbsent ? "AB" : (subject.practicalGpa?.toFixed(1) || "—")}
                          </td>
                          <td className="center">
                            {subject.isAbsent ? "AB" : (subject.practicalGrade || "—")}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan="2" className="right bold">
                    TOTAL
                  </td>
                  <td className="center bold">
                    {totalCreditHours.toFixed(2)}
                  </td>
                  <td colSpan="4" className="center bold">
                    GRADE POINT AVERAGE (GPA): {summary?.gpa?.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Attendance & Remarks Row */}
          <section className="attendance-section">
            <div className="attendance-grid">
              <div className="attendance-item">
                <span className="label">ATTENDANCE:</span>
                <span className="value">{summary?.attendancePresent || "—"} / {summary?.attendanceTotal || "—"}</span>
              </div>
              <div className="attendance-item">
                <span className="label">REMARKS:</span>
                <span className="value">{getRemarkText(summary?.grade) || "—"}</span>
              </div>
            </div>
          </section>

          {/* Summary Section */}
          <section className="summary-section">
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Total Subjects:</span>
                <span className="value">{summary?.totalSubjects || 0}</span>
              </div>
              <div className="summary-item">
                <span className="label">Subjects Passed:</span>
                <span className="value">
                  {summary?.passedSubjects || 0}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">Subjects Failed:</span>
                <span className="value">
                  {summary?.failedSubjects || 0}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">Class Rank:</span>
                <span className="value">{summary?.classRank || "N/A"}</span>
              </div>
              {/* Show total credit hours for NEB classes */}
              {data.isNEBClass && summary?.totalCredits && (
                <div className="summary-item">
                  <span className="label">Total Credits:</span>
                  <span className="value">{summary.totalCredits}</span>
                </div>
              )}
              <div className="summary-item highlight">
                <span className="label">Final GPA:</span>
                <span className="value large">
                  {summary?.gpa?.toFixed(2)}
                  {data.isNEBClass && (
                    <small
                      style={{
                        fontSize: "0.7em",
                        marginLeft: "4px",
                        opacity: 0.8,
                      }}
                    >
                      (Credit Weighted)
                    </small>
                  )}
                </span>
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

          {/* Remarks Section */}
          {(remarks?.teacher || remarks?.principal) && (
            <section className="remarks-section">
              {remarks?.teacher && (
                <div className="remark-item">
                  <span className="label">Class Teacher's Remarks:</span>
                  <span className="value">{remarks.teacher}</span>
                </div>
              )}
              {remarks?.principal && (
                <div className="remark-item">
                  <span className="label">Principal's Remarks:</span>
                  <span className="value">{remarks.principal}</span>
                </div>
              )}
            </section>
          )}

          {/* Signature Section */}
          <section className="signature-section">
            <div className="signature-grid">
              <div className="signature-item">
                <div className="signature-line"></div>
                <span className="signature-label">CLASS TEACHER</span>
              </div>
              <div className="signature-item">
                <div className="signature-line"></div>
                <span className="signature-label">EXAM CO-ORDINATOR</span>
              </div>
              <div className="signature-item">
                <div className="signature-line"></div>
                <span className="signature-label">PRINCIPAL</span>
              </div>
            </div>
            <div className="issue-date">
              <span>Date of Issue: {examination?.academicYearBS ? `${examination.academicYearBS}` : "_______________"}</span>
            </div>
          </section>

          {/* Footer */}
          <footer className="report-footer">
            <p className="contact-info">
              {school?.landlineNumber && `Ph: ${school.landlineNumber}`}
              {school?.landlineNumber && school?.phone && ", "}
              {school?.phone && school.phone}
              {(school?.landlineNumber || school?.phone) && school?.email && ", "}
              {school?.email && `Email: ${school.email}`}
            </p>
          </footer>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        /* Report Card Overlay */
        .report-card-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 1000;
          overflow-y: auto;
          padding: 20px;
        }

        /* Action Buttons */
        .report-actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 1rem;
          position: sticky;
          top: 0;
          z-index: 1001;
          background: transparent;
          padding: 10px;
        }

        .report-actions .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          font-size: 0.9rem;
        }

        .report-actions .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .report-actions .btn-secondary {
          background: #10b981;
          color: white;
        }

        .report-actions .btn-outline {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        /* A4 Container */
        .report-card-container {
          display: flex;
          justify-content: center;
        }

        .report-card-a4 {
          width: 210mm;
          min-height: 297mm;
          background: white;
          padding: 15mm 15mm;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          color: #1a1a1a;
          box-sizing: border-box;
        }

        /* Header */
        .report-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 3px double #1a1a1a;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }

        .school-logo {
          width: 70px;
          height: 70px;
        }

        .school-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .logo-placeholder {
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          background: #fff;
          border: 1px solid #000;
        }

        .school-info {
          text-align: center;
          flex: 1;
          padding: 0 20px;
        }

        .school-name {
          font-size: 22pt;
          font-weight: bold;
          margin: 0;
          color: #000;
          text-transform: uppercase;
        }

        .school-address {
          font-size: 10pt;
          margin: 5px 0;
          color: #000;
        }

        .school-tagline {
          font-size: 10pt;
          font-style: italic;
          color: #000;
          margin: 3px 0;
        }

        .school-contact {
          font-size: 9pt;
          color: #000;
          margin: 0;
        }

        .school-website {
          font-size: 9pt;
          color: #000;
          margin: 2px 0 0;
        }

        /* Report Title */
        .report-title {
          text-align: center;
          margin: 15px 0;
          padding: 10px;
          background: #fff;
          color: #000;
          border: 1px solid #000;
        }

        .report-title h2 {
          margin: 0;
          font-size: 16pt;
          letter-spacing: 2px;
        }

        .report-title h3 {
          margin: 5px 0 0;
          font-size: 12pt;
          font-weight: normal;
        }

        .academic-year {
          margin: 5px 0 0;
          font-size: 10pt;
          opacity: 0.9;
        }

        /* Student Info Section */
        .student-info-section {
          margin: 15px 0;
          padding: 10px;
          background: #fff;
          border: 1px solid #000;
          border-radius: 0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
        }

        .info-item .label {
          font-size: 9pt;
          color: #000;
          font-weight: 600;
        }

        .info-item .value {
          font-size: 11pt;
          font-weight: bold;
          color: #000;
        }

        /* Marks Table */
        .marks-section {
          margin: 15px 0;
        }

        .marks-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
        }

        .marks-table th,
        .marks-table td {
          border: 1px solid #000;
          padding: 6px 4px;
        }

        .marks-table thead th {
          background: #fff;
          color: #000;
          font-weight: bold;
          text-align: center;
          vertical-align: middle;
        }

        .marks-table .sn-col { width: 40px; }
        .marks-table .subject-col { width: auto; }
        .marks-table .ch-col { width: 80px; }
        .marks-table .gp-col { width: 80px; }
        .marks-table .grade-col { width: 60px; }
        .marks-table .fg-col { width: 80px; }
        .marks-table .remarks-col { width: 100px; }

        .marks-table tbody tr {
          background: #fff;
        }

        .marks-table .center {
          text-align: center;
          vertical-align: middle;
        }

        .marks-table .right {
          text-align: right;
        }

        .marks-table .bold {
          font-weight: bold;
        }

        .marks-table .subject-name {
          font-weight: 500;
          padding-left: 8px;
        }

        .marks-table .sn-cell {
          vertical-align: middle;
        }

        .marks-table .fg-cell {
          font-weight: bold;
          vertical-align: middle;
        }

        .marks-table .remarks-cell {
          font-size: 8pt;
          vertical-align: middle;
        }

        .marks-table .theory-row td {
          border-bottom: none;
        }

        .marks-table .internal-row td {
          border-top: none;
        }

        .marks-table tfoot .total-row {
          background: #fff;
          font-weight: bold;
        }

        .marks-table tfoot .total-row td {
          padding: 8px 4px;
        }

        /* Attendance Section */
        .attendance-section {
          margin: 10px 0;
          padding: 8px;
          border: 1px solid #000;
        }

        .attendance-grid {
          display: flex;
          justify-content: space-between;
        }

        .attendance-item {
          display: flex;
          gap: 8px;
        }

        .attendance-item .label {
          font-weight: bold;
        }

        .attendance-item .value {
          font-weight: bold;
        }

        /* Grade text - plain styling */
        .grade-badge {
          font-weight: bold;
          font-size: 9pt;
        }

        .grade-badge.small {
          font-size: 8pt;
        }

        .grade-badge.large {
          font-size: 11pt;
        }

        /* Summary Section */
        .summary-section {
          margin: 15px 0;
          padding: 10px;
          background: #fff;
          border: 1px solid #000;
          border-radius: 0;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
        }

        .summary-item {
          text-align: center;
          padding: 5px;
        }

        .summary-item .label {
          display: block;
          font-size: 8pt;
          color: #000;
        }

        .summary-item .value {
          display: block;
          font-size: 12pt;
          font-weight: bold;
          color: #000;
        }

        .summary-item .value.large {
          font-size: 16pt;
        }

        .summary-item.highlight {
          background: white;
          border: 1px solid #000;
        }

        /* Remarks Section */
        .remarks-section {
          margin: 15px 0;
          padding: 10px;
          background: #fff;
          border: 1px solid #000;
          border-radius: 0;
        }

        .remark-item {
          margin-bottom: 8px;
        }

        .remark-item:last-child {
          margin-bottom: 0;
        }

        .remark-item .label {
          font-weight: bold;
          color: #000;
        }

        /* Signature Section */
        .signature-section {
          margin-top: 30px;
          padding-top: 20px;
        }

        .signature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
          margin-bottom: 20px;
        }

        .signature-item {
          text-align: center;
        }

        .signature-line {
          border-bottom: 1px solid #1a1a1a;
          height: 40px;
          margin-bottom: 5px;
        }

        .signature-label {
          font-size: 9pt;
          font-weight: bold;
        }

        .issue-date {
          text-align: right;
          font-size: 9pt;
          margin-top: 10px;
        }

        /* Footer */
        .report-footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #000;
          text-align: center;
          font-size: 8pt;
          color: #000;
        }

        .report-footer .note {
          font-style: italic;
          margin: 0;
        }

        .report-footer .generated-date {
          margin: 5px 0 0;
        }

        /* Print Styles */
        @media print {
          .no-print {
            display: none !important;
          }

          .report-card-overlay {
            position: static;
            background: none;
            padding: 0;
            overflow: visible;
          }

          .report-card-container {
            display: block;
          }

          .report-card-a4 {
            width: 100%;
            min-height: auto;
            box-shadow: none;
            padding: 10mm;
            margin: 0;
          }

          @page {
            size: A4;
            margin: 10mm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }

        /* Responsive adjustments for screen */
        @media screen and (max-width: 800px) {
          .report-card-a4 {
            width: 100%;
            min-height: auto;
            padding: 10px;
          }

          .info-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .summary-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .signature-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default NepalReportCard;
