import React, { useRef } from "react";
import { Printer, Download, X } from "lucide-react";

/**
 * Nepal-style Report Card Component
 * A4 printable format following NEB/Nepal school standards
 *
 * Features:
 * - Official school header with logo
 * - Student information section
 * - Subject-wise marks with theory/practical breakdown
 * - Nepal GPA grading system (A+ to NG)
 * - Grade reference table
 * - Signature sections
 */

// Grade colors for visual display
const getGradeColor = (grade) => {
  const colors = {
    "A+": { bg: "#dcfce7", text: "#166534" },
    A: { bg: "#d1fae5", text: "#065f46" },
    "B+": { bg: "#dbeafe", text: "#1e40af" },
    B: { bg: "#e0e7ff", text: "#3730a3" },
    "C+": { bg: "#fef3c7", text: "#92400e" },
    C: { bg: "#fef9c3", text: "#854d0e" },
    D: { bg: "#fed7aa", text: "#9a3412" },
    NG: { bg: "#fee2e2", text: "#991b1b" },
    AB: { bg: "#f3f4f6", text: "#6b7280" },
  };
  return colors[grade] || colors["NG"];
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

const NepalReportCard = ({ data, onClose, showActions = true }) => {
  const reportRef = useRef(null);

  if (!data) return null;

  const { school, examination, student, subjects, summary, remarks } = data;

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
              {school?.logoUrl ? (
                <img src={school.logoUrl} alt="School Logo" />
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

          {/* Marks Table */}
          <section className="marks-section">
            <table className="marks-table">
              <thead>
                <tr>
                  <th rowSpan="2" className="sn-col">
                    S.N.
                  </th>
                  <th rowSpan="2" className="subject-col">
                    Subject
                  </th>
                  <th colSpan="2" className="theory-header">
                    Theory
                  </th>
                  <th colSpan="2" className="practical-header">
                    Practical
                  </th>
                  <th rowSpan="2" className="total-col">
                    Total
                  </th>
                  <th rowSpan="2" className="grade-col">
                    Grade
                  </th>
                  <th rowSpan="2" className="gpa-col">
                    GPA
                  </th>
                  <th rowSpan="2" className="remarks-col">
                    Remarks
                  </th>
                </tr>
                <tr>
                  <th className="marks-sub">Marks</th>
                  <th className="marks-sub">Grade</th>
                  <th className="marks-sub">Marks</th>
                  <th className="marks-sub">Grade</th>
                </tr>
              </thead>
              <tbody>
                {subjects?.map((subject, index) => {
                  const gradeColor = getGradeColor(subject.finalGrade);
                  return (
                    <tr key={subject.subjectId || index}>
                      <td className="center">{index + 1}</td>
                      <td className="subject-name">{subject.subjectName}</td>
                      <td className="center">
                        {subject.isAbsent
                          ? "AB"
                          : `${subject.theoryMarks}/${subject.theoryFullMarks}`}
                      </td>
                      <td className="center">
                        <span
                          className="grade-badge small"
                          style={{
                            backgroundColor: getGradeColor(subject.theoryGrade)
                              .bg,
                            color: getGradeColor(subject.theoryGrade).text,
                          }}
                        >
                          {subject.theoryGrade}
                        </span>
                      </td>
                      <td className="center">
                        {subject.hasPractical
                          ? subject.isAbsent
                            ? "AB"
                            : `${subject.practicalMarks}/${subject.practicalFullMarks}`
                          : "—"}
                      </td>
                      <td className="center">
                        {subject.hasPractical ? (
                          <span
                            className="grade-badge small"
                            style={{
                              backgroundColor: getGradeColor(
                                subject.practicalGrade,
                              ).bg,
                              color: getGradeColor(subject.practicalGrade).text,
                            }}
                          >
                            {subject.practicalGrade}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="center bold">
                        {subject.isAbsent
                          ? "AB"
                          : `${subject.totalMarks}/${subject.totalFullMarks}`}
                      </td>
                      <td className="center">
                        <span
                          className="grade-badge"
                          style={{
                            backgroundColor: gradeColor.bg,
                            color: gradeColor.text,
                          }}
                        >
                          {subject.finalGrade}
                        </span>
                      </td>
                      <td className="center bold">
                        {subject.finalGpa?.toFixed(2)}
                      </td>
                      <td className="center small-text">
                        {subject.isPassed ? (
                          <span className="text-success">✓</span>
                        ) : (
                          <span className="text-danger">
                            {subject.remark || "Failed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan="2" className="right bold">
                    Grand Total:
                  </td>
                  <td colSpan="4" className="center bold">
                    {summary?.totalMarks?.toFixed(1)} /{" "}
                    {summary?.totalFullMarks}
                  </td>
                  <td className="center bold">
                    {summary?.percentage?.toFixed(2)}%
                  </td>
                  <td className="center">
                    <span
                      className="grade-badge large"
                      style={{
                        backgroundColor: getGradeColor(summary?.grade).bg,
                        color: getGradeColor(summary?.grade).text,
                      }}
                    >
                      {summary?.grade}
                    </span>
                  </td>
                  <td className="center bold large">
                    {summary?.gpa?.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
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
                <span className="value text-success">
                  {summary?.passedSubjects || 0}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">Subjects Failed:</span>
                <span className="value text-danger">
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
                <span
                  className={`value large ${
                    summary?.isPassed ? "text-success" : "text-danger"
                  }`}
                >
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
                <span className="signature-label">Class Teacher</span>
              </div>
              <div className="signature-item">
                <div className="signature-line"></div>
                <span className="signature-label">Exam Controller</span>
              </div>
              <div className="signature-item">
                <div className="signature-line"></div>
                <span className="signature-label">Principal</span>
              </div>
            </div>
            <div className="issue-date">
              <span>Date of Issue: _______________</span>
            </div>
          </section>

          {/* Footer */}
          <footer className="report-footer">
            <p className="note">
              Note: This is a computer-generated report card. No signature
              required for internal use.
            </p>
            <p className="generated-date">
              Generated on: {formatDate(new Date().toISOString())}
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
          background: #f3f4f6;
          border-radius: 8px;
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
          color: #1e3a5f;
          text-transform: uppercase;
        }

        .school-address {
          font-size: 10pt;
          margin: 5px 0;
          color: #4a5568;
        }

        .school-tagline {
          font-size: 10pt;
          font-style: italic;
          color: #4a5568;
          margin: 3px 0;
        }

        .school-contact {
          font-size: 9pt;
          color: #718096;
          margin: 0;
        }

        .school-website {
          font-size: 9pt;
          color: #3182ce;
          margin: 2px 0 0;
        }

        /* Report Title */
        .report-title {
          text-align: center;
          margin: 15px 0;
          padding: 10px;
          background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
          color: white;
          border-radius: 4px;
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
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
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
          color: #64748b;
          font-weight: 600;
        }

        .info-item .value {
          font-size: 11pt;
          font-weight: bold;
          color: #1e293b;
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
          border: 1px solid #cbd5e1;
          padding: 6px 4px;
        }

        .marks-table thead th {
          background: #1e3a5f;
          color: white;
          font-weight: bold;
          text-align: center;
        }

        .marks-table .theory-header {
          background: #2563eb;
        }

        .marks-table .practical-header {
          background: #7c3aed;
        }

        .marks-table .marks-sub {
          font-size: 8pt;
          background: #e2e8f0;
          color: #1e293b;
        }

        .marks-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .marks-table tbody tr:hover {
          background: #f1f5f9;
        }

        .marks-table .center {
          text-align: center;
        }

        .marks-table .right {
          text-align: right;
        }

        .marks-table .bold {
          font-weight: bold;
        }

        .marks-table .subject-name {
          font-weight: 500;
        }

        .marks-table .small-text {
          font-size: 8pt;
        }

        .marks-table tfoot .total-row {
          background: #f1f5f9;
          font-weight: bold;
        }

        .marks-table tfoot .total-row td {
          padding: 8px 4px;
        }

        /* Grade Badge */
        .grade-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 9pt;
        }

        .grade-badge.small {
          padding: 1px 4px;
          font-size: 8pt;
        }

        .grade-badge.large {
          padding: 4px 12px;
          font-size: 11pt;
        }

        /* Summary Section */
        .summary-section {
          margin: 15px 0;
          padding: 10px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 4px;
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
          color: #64748b;
        }

        .summary-item .value {
          display: block;
          font-size: 12pt;
          font-weight: bold;
          color: #1e293b;
        }

        .summary-item .value.large {
          font-size: 16pt;
        }

        .summary-item.highlight {
          background: white;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        /* Remarks Section */
        .remarks-section {
          margin: 15px 0;
          padding: 10px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 4px;
        }

        .remark-item {
          margin-bottom: 8px;
        }

        .remark-item:last-child {
          margin-bottom: 0;
        }

        .remark-item .label {
          font-weight: bold;
          color: #92400e;
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
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 8pt;
          color: #94a3b8;
        }

        .report-footer .note {
          font-style: italic;
          margin: 0;
        }

        .report-footer .generated-date {
          margin: 5px 0 0;
        }

        /* Text Colors */
        .text-success { color: #16a34a; }
        .text-danger { color: #dc2626; }

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
