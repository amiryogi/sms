import React, { useRef } from "react";
import { Printer, X, Loader2 } from "lucide-react";

/**
 * Bulk Report Card Print Component
 * Renders multiple report cards for printing with page breaks
 * Each student's report card fits on one A4 page
 *
 * Key Features:
 * - Compact mode for 12+ subjects (auto-detected)
 * - Theory+Internal rows kept together
 * - Print-optimized fonts and spacing
 * - Professional borders for printing
 */

// Constants for layout calculations
const MAX_SUBJECTS_NORMAL = 10; // Normal mode supports up to 10 subjects comfortably
const MAX_SUBJECTS_COMPACT = 16; // Compact mode can fit up to 16 subjects

// Resolve asset URLs (handles relative backend paths)
const resolveAssetUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1$/, "")
    : window.location.origin;
  return `${base}/${url.replace(/^\\?/, "").replace(/^\//, "").replace(/\\/g, "/")}`;
};

// Get remark text based on grade
const getRemarkText = (grade) => {
  const remarks = {
    "A+": "OUTSTANDING",
    A: "EXCELLENT",
    "B+": "VERY GOOD",
    B: "GOOD",
    "C+": "SATISFACTORY",
    C: "ACCEPTABLE",
    D: "PARTIALLY ACCEPTABLE",
    NG: "NOT GRADED",
  };
  return remarks[grade] || "";
};

const BulkReportCardPrint = ({ data, onClose, loading = false }) => {
  const printRef = useRef(null);

  if (loading) {
    return (
      <div className="bulk-print-overlay">
        <div className="bulk-print-loading">
          <Loader2 className="spin" size={48} />
          <p>Loading Report Cards...</p>
          <button className="btn btn-outline" onClick={onClose}>
            <X size={16} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.reportCards || data.reportCards.length === 0) {
    return (
      <div className="bulk-print-overlay">
        <div className="bulk-print-loading">
          <p>No report cards to display</p>
          <button className="btn btn-outline" onClick={onClose}>
            <X size={16} /> Close
          </button>
        </div>
      </div>
    );
  }

  const { examName, className, sectionName, reportCards } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bulk-print-overlay">
      {/* Action Buttons - Hidden when printing */}
      <div className="bulk-print-actions no-print">
        <div className="bulk-print-info">
          <strong>{examName}</strong> | {className} - {sectionName} |{" "}
          {reportCards.length} Students
        </div>
        <div className="bulk-print-buttons">
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Print All ({reportCards.length})
          </button>
          <button className="btn btn-outline" onClick={onClose}>
            <X size={16} /> Close
          </button>
        </div>
      </div>

      {/* Print Container */}
      <div className="bulk-print-container" ref={printRef}>
        {reportCards.map((reportData, index) => {
          // Detect if compact mode needed based on subject count
          const subjectCount = reportData.subjects?.length || 0;
          const needsCompact = subjectCount > MAX_SUBJECTS_NORMAL;

          return (
            <div
              key={reportData.student?.id || index}
              className={`report-card-page ${needsCompact ? "compact-mode" : ""}`}
            >
              <SingleReportCard data={reportData} compactMode={needsCompact} />
            </div>
          );
        })}
      </div>

      <style>{`
        /* Overlay */
        .bulk-print-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #f1f5f9;
          z-index: 1000;
          overflow-y: auto;
        }

        /* Loading State */
        .bulk-print-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 1rem;
          background: white;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Action Bar */
        .bulk-print-actions {
          position: sticky;
          top: 0;
          z-index: 1001;
          background: white;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .bulk-print-info {
          font-size: 1rem;
          color: #334155;
        }

        .bulk-print-buttons {
          display: flex;
          gap: 0.75rem;
        }

        .bulk-print-buttons .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          font-size: 0.875rem;
          border: none;
        }

        .bulk-print-buttons .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .bulk-print-buttons .btn-outline {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        /* Container */
        .bulk-print-container {
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        /* Each Report Card Page */
        .report-card-page {
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        /* A4 Report Card Styles */
        .report-a4 {
          width: 210mm;
          height: 297mm;
          padding: 10mm 12mm;
          box-sizing: border-box;
          font-family: 'Times New Roman', Times, serif;
          font-size: 10pt;
          color: #000;
          background: white;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        /* Logo Placeholder */
        .logo-placeholder {
          display: inline-block;
          font-size: 36px;
          line-height: 1;
          margin-bottom: 4px;
        }

        /* Header */
        .report-header {
          text-align: center;
          margin-bottom: 8px;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          flex-shrink: 0;
        }

        .report-header .school-logo {
          height: 50px;
          width: auto;
          margin-bottom: 4px;
          object-fit: contain;
        }

        .report-header .school-name {
          font-size: 16pt;
          font-weight: bold;
          margin: 0;
          text-transform: uppercase;
        }

        .report-header .school-address {
          font-size: 10pt;
          margin: 2px 0;
        }

        .report-header .exam-title {
          font-size: 12pt;
          font-weight: bold;
          margin-top: 6px;
          text-transform: uppercase;
        }

        /* Student Info */
        .student-info {
          margin: 8px 0;
          padding: 6px;
          border: 1px solid #000;
          flex-shrink: 0;
        }

        .student-info .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px 12px;
          font-size: 9pt;
        }

        .student-info .info-item {
          display: flex;
          gap: 4px;
        }

        .student-info .label {
          font-weight: bold;
        }

        /* Marks Table */
        .marks-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5pt;
          margin: 8px 0;
          flex-grow: 1;
        }

        .marks-table th,
        .marks-table td {
          border: 1px solid #000;
          padding: 4px 3px;
        }

        .marks-table thead th {
          background: #fff;
          font-weight: bold;
          text-align: center;
          font-size: 8pt;
        }

        .marks-table .sn-col { width: 30px; }
        .marks-table .subject-col { width: auto; }
        .marks-table .ch-col { width: 65px; }
        .marks-table .gp-col { width: 65px; }
        .marks-table .grade-col { width: 50px; }
        .marks-table .fg-col { width: 65px; }
        .marks-table .remarks-col { width: 85px; }

        .marks-table .center { text-align: center; }
        .marks-table .bold { font-weight: bold; }

        .marks-table .subject-name {
          padding-left: 6px;
        }

        .marks-table .theory-row td {
          border-bottom: none;
        }

        .marks-table .internal-row td {
          border-top: none;
        }

        .marks-table .sn-cell,
        .marks-table .fg-cell,
        .marks-table .remarks-cell {
          vertical-align: middle;
        }

        .marks-table .fg-cell {
          font-weight: bold;
        }

        .marks-table .remarks-cell {
          font-size: 7.5pt;
        }

        .marks-table tfoot td {
          font-weight: bold;
          padding: 5px 3px;
        }

        /* Subject group for page-break control */
        .marks-table .subject-group {
          page-break-inside: avoid;
        }

        /* Attendance */
        .attendance-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 8px;
          border: 1px solid #000;
          margin: 8px 0;
          font-size: 9pt;
          flex-shrink: 0;
        }

        .attendance-row .item {
          display: flex;
          gap: 6px;
        }

        .attendance-row .label {
          font-weight: bold;
        }

        /* Signature Section */
        .signature-section {
          margin-top: auto;
          padding-top: 12px;
          flex-shrink: 0;
        }

        .signature-grid {
          display: flex;
          justify-content: space-between;
          padding: 0 20px;
        }

        .signature-item {
          text-align: center;
          min-width: 120px;
        }

        .signature-line {
          border-top: 1px solid #000;
          width: 100%;
          margin-bottom: 4px;
          margin-top: 30px;
        }

        .signature-label {
          font-size: 8pt;
          font-weight: bold;
        }

        .issue-date {
          text-align: center;
          margin-top: 10px;
          font-size: 9pt;
        }

        /* Footer */
        .report-footer {
          margin-top: 8px;
          text-align: center;
          font-size: 8pt;
          border-top: 1px solid #000;
          padding-top: 4px;
          flex-shrink: 0;
        }

        /* ========================================
           COMPACT MODE - For 12+ subjects
           Reduces all spacing and fonts
           ======================================== */
        .compact-mode .report-a4,
        .report-a4.compact {
          padding: 8mm 10mm;
        }

        .compact-mode .report-header,
        .report-a4.compact .report-header {
          margin-bottom: 5px;
          padding-bottom: 5px;
        }

        .compact-mode .report-header .school-logo,
        .report-a4.compact .report-header .school-logo {
          height: 40px;
        }

        .compact-mode .logo-placeholder,
        .report-a4.compact .logo-placeholder {
          font-size: 28px;
        }

        .compact-mode .report-header .school-name,
        .report-a4.compact .report-header .school-name {
          font-size: 14pt;
        }

        .compact-mode .report-header .school-address,
        .report-a4.compact .report-header .school-address {
          font-size: 9pt;
        }

        .compact-mode .report-header .exam-title,
        .report-a4.compact .report-header .exam-title {
          font-size: 10pt;
          margin-top: 4px;
        }

        .compact-mode .student-info,
        .report-a4.compact .student-info {
          margin: 5px 0;
          padding: 4px;
        }

        .compact-mode .student-info .info-grid,
        .report-a4.compact .student-info .info-grid {
          gap: 2px 8px;
          font-size: 8pt;
        }

        .compact-mode .marks-table,
        .report-a4.compact .marks-table {
          font-size: 7.5pt;
          margin: 5px 0;
        }

        .compact-mode .marks-table th,
        .compact-mode .marks-table td,
        .report-a4.compact .marks-table th,
        .report-a4.compact .marks-table td {
          padding: 2px 2px;
        }

        .compact-mode .marks-table thead th,
        .report-a4.compact .marks-table thead th {
          font-size: 7pt;
        }

        .compact-mode .marks-table .remarks-cell,
        .report-a4.compact .marks-table .remarks-cell {
          font-size: 6.5pt;
        }

        .compact-mode .attendance-row,
        .report-a4.compact .attendance-row {
          padding: 4px 6px;
          margin: 5px 0;
          font-size: 8pt;
        }

        .compact-mode .signature-section,
        .report-a4.compact .signature-section {
          padding-top: 8px;
        }

        .compact-mode .signature-line,
        .report-a4.compact .signature-line {
          margin-top: 20px;
        }

        .compact-mode .signature-label,
        .report-a4.compact .signature-label {
          font-size: 7pt;
        }

        .compact-mode .issue-date,
        .report-a4.compact .issue-date {
          margin-top: 6px;
          font-size: 8pt;
        }

        .compact-mode .report-footer,
        .report-a4.compact .report-footer {
          margin-top: 5px;
          font-size: 7pt;
          padding-top: 3px;
        }

        /* ========================================
           PRINT STYLES - Comprehensive A4 Optimization
           ======================================== */
        @media print {
          /* Page setup */
          @page {
            size: A4 portrait;
            margin: 0;
          }

          /* Force color printing */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          body {
            margin: 0;
            padding: 0;
          }

          /* Hide non-printable elements */
          .no-print,
          .bulk-print-actions {
            display: none !important;
          }

          /* Remove overlay styling */
          .bulk-print-overlay {
            position: static;
            background: white;
            overflow: visible;
            padding: 0;
          }

          .bulk-print-container {
            padding: 0;
            gap: 0;
            display: block;
          }

          /* Page break control per student */
          .report-card-page {
            page-break-after: always;
            page-break-inside: avoid;
            break-after: page;
            break-inside: avoid;
            box-shadow: none;
            margin: 0;
            padding: 0;
          }

          /* Prevent blank last page */
          .report-card-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          /* A4 dimensions for print */
          .report-a4 {
            width: 210mm;
            height: 297mm;
            padding: 8mm 10mm;
            box-shadow: none;
            margin: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          /* Header print optimization */
          .report-header {
            border-bottom: 2px solid #000 !important;
            margin-bottom: 6px;
            padding-bottom: 6px;
          }

          .report-header .school-logo {
            height: 45px;
          }

          .logo-placeholder {
            font-size: 32px;
          }

          .report-header .school-name {
            font-size: 14pt;
          }

          .report-header .school-address {
            font-size: 9pt;
          }

          .report-header .exam-title {
            font-size: 11pt;
            margin-top: 4px;
          }

          /* Student info print optimization */
          .student-info {
            border: 1.5px solid #000 !important;
            margin: 5px 0;
            padding: 5px;
          }

          .student-info .info-grid {
            font-size: 8pt;
            gap: 3px 10px;
          }

          /* Table print optimization */
          .marks-table {
            font-size: 8pt;
            margin: 5px 0;
            border: 2px solid #000 !important;
          }

          .marks-table th,
          .marks-table td {
            border: 1.5px solid #000 !important;
            padding: 3px 2px;
          }

          .marks-table thead {
            display: table-header-group;
          }

          .marks-table thead th {
            font-size: 7.5pt;
            background: #fff !important;
          }

          /* Keep subject groups together (Theory + Internal rows) */
          .marks-table .subject-group {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .marks-table .theory-row {
            page-break-after: avoid;
            break-after: avoid;
          }

          .marks-table .internal-row {
            page-break-before: avoid;
            break-before: avoid;
          }

          .marks-table tfoot {
            display: table-footer-group;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .marks-table tfoot td {
            border-top: 2px solid #000 !important;
            padding: 4px 2px;
          }

          .marks-table .remarks-cell {
            font-size: 7pt;
          }

          /* Column widths for print */
          .marks-table .sn-col { width: 25px; }
          .marks-table .ch-col { width: 55px; }
          .marks-table .gp-col { width: 55px; }
          .marks-table .grade-col { width: 45px; }
          .marks-table .fg-col { width: 55px; }
          .marks-table .remarks-col { width: 75px; }

          /* Attendance row print */
          .attendance-row {
            border: 1.5px solid #000 !important;
            margin: 5px 0;
            padding: 4px 6px;
            font-size: 8pt;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Signature section - prevent orphaning */
          .signature-section {
            margin-top: auto;
            padding-top: 10px;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: avoid;
            break-before: avoid;
          }

          .signature-line {
            border-top: 1px solid #000 !important;
            margin-top: 25px;
          }

          .signature-label {
            font-size: 7pt;
          }

          .issue-date {
            font-size: 8pt;
            margin-top: 8px;
          }

          /* Footer print */
          .report-footer {
            border-top: 1px solid #000 !important;
            margin-top: 5px;
            padding-top: 3px;
            font-size: 7pt;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* ========================================
             COMPACT MODE PRINT OVERRIDES
             ======================================== */
          .compact-mode .report-a4,
          .report-a4.compact {
            padding: 6mm 8mm;
          }

          .compact-mode .report-header .school-logo,
          .report-a4.compact .report-header .school-logo {
            height: 35px;
          }

          .compact-mode .logo-placeholder,
          .report-a4.compact .logo-placeholder {
            font-size: 24px;
          }

          .compact-mode .report-header .school-name,
          .report-a4.compact .report-header .school-name {
            font-size: 12pt;
          }

          .compact-mode .report-header .school-address,
          .report-a4.compact .report-header .school-address {
            font-size: 8pt;
          }

          .compact-mode .report-header .exam-title,
          .report-a4.compact .report-header .exam-title {
            font-size: 9pt;
          }

          .compact-mode .student-info .info-grid,
          .report-a4.compact .student-info .info-grid {
            font-size: 7pt;
          }

          .compact-mode .marks-table,
          .report-a4.compact .marks-table {
            font-size: 7pt;
          }

          .compact-mode .marks-table th,
          .compact-mode .marks-table td,
          .report-a4.compact .marks-table th,
          .report-a4.compact .marks-table td {
            padding: 2px 1px;
          }

          .compact-mode .marks-table thead th,
          .report-a4.compact .marks-table thead th {
            font-size: 6.5pt;
          }

          .compact-mode .marks-table .remarks-cell,
          .report-a4.compact .marks-table .remarks-cell {
            font-size: 6pt;
          }

          .compact-mode .attendance-row,
          .report-a4.compact .attendance-row {
            font-size: 7pt;
            padding: 3px 4px;
          }

          .compact-mode .signature-line,
          .report-a4.compact .signature-line {
            margin-top: 18px;
          }

          .compact-mode .signature-label,
          .report-a4.compact .signature-label {
            font-size: 6pt;
          }

          .compact-mode .issue-date,
          .report-a4.compact .issue-date {
            font-size: 7pt;
          }

          .compact-mode .report-footer,
          .report-a4.compact .report-footer {
            font-size: 6pt;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Single Report Card Component (simplified for bulk print)
 * @param {Object} data - Report card data
 * @param {boolean} compactMode - Whether to use compact styling for many subjects
 */
const SingleReportCard = ({ data, compactMode = false }) => {
  const [logoError, setLogoError] = React.useState(false);

  if (!data) return null;

  const { school, examination, student, subjects, summary } = data;

  // Calculate total credit hours
  const totalCreditHours =
    subjects?.reduce(
      (acc, s) =>
        acc +
        (parseFloat(s.theoryCreditHours) || 0) +
        (parseFloat(s.internalCreditHours) || 0),
      0,
    ) || 0;

  return (
    <div className={`report-a4 ${compactMode ? "compact" : ""}`}>
      {/* Header */}
      <header className="report-header">
        {school?.logoUrl && !logoError ? (
          <img
            src={resolveAssetUrl(school.logoUrl)}
            alt="School Logo"
            className="school-logo"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="logo-placeholder">🏫</div>
        )}
        <h1 className="school-name">{school?.name || "School Name"}</h1>
        <p className="school-address">{school?.address || ""}</p>
        <p className="exam-title">{examination?.name || "GRADE SHEET"}</p>
      </header>

      {/* Student Info */}
      <section className="student-info">
        <div className="info-grid">
          <div className="info-item">
            <span className="label">Name:</span>
            <span>{student?.name || "N/A"}</span>
          </div>
          <div className="info-item">
            <span className="label">Roll No:</span>
            <span>{student?.rollNumber || "N/A"}</span>
          </div>
          <div className="info-item">
            <span className="label">Class:</span>
            <span>{student?.class || "N/A"}</span>
          </div>
          <div className="info-item">
            <span className="label">Section:</span>
            <span>{student?.section || "N/A"}</span>
          </div>
        </div>
      </section>

      {/* Marks Table */}
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
        {subjects?.map((subject, index) => {
          const remarkText = getRemarkText(subject.finalGrade);
          return (
            // Wrap each subject's rows in tbody for page-break control
            // This keeps Theory + Internal rows together
            <tbody key={subject.subjectId || index} className="subject-group">
              {/* Theory Row */}
              <tr className="theory-row">
                <td
                  rowSpan={subject.hasPractical ? 2 : 1}
                  className="center sn-cell"
                >
                  {index + 1}
                </td>
                <td className="subject-name">{subject.subjectName} (TH)</td>
                <td className="center">{subject.theoryCreditHours || "—"}</td>
                <td className="center">
                  {subject.isAbsent
                    ? "AB"
                    : subject.theoryGpa?.toFixed(1) || "—"}
                </td>
                <td className="center">
                  {subject.isAbsent ? "AB" : subject.theoryGrade || "—"}
                </td>
                <td
                  rowSpan={subject.hasPractical ? 2 : 1}
                  className="center bold fg-cell"
                >
                  {subject.isAbsent ? "AB" : subject.finalGrade}
                </td>
                <td
                  rowSpan={subject.hasPractical ? 2 : 1}
                  className="center remarks-cell"
                >
                  {subject.isAbsent ? "ABSENT" : remarkText}
                </td>
              </tr>
              {/* Internal/Practical Row */}
              {subject.hasPractical && (
                <tr className="internal-row">
                  <td className="subject-name">{subject.subjectName} (IN)</td>
                  <td className="center">
                    {subject.internalCreditHours || "—"}
                  </td>
                  <td className="center">
                    {subject.isAbsent
                      ? "AB"
                      : subject.practicalGpa?.toFixed(1) || "—"}
                  </td>
                  <td className="center">
                    {subject.isAbsent ? "AB" : subject.practicalGrade || "—"}
                  </td>
                </tr>
              )}
            </tbody>
          );
        })}
        <tfoot>
          <tr>
            <td colSpan="2" className="center bold">
              TOTAL
            </td>
            <td className="center bold">{totalCreditHours.toFixed(2)}</td>
            <td colSpan="4" className="center bold">
              GRADE POINT AVERAGE (GPA): {summary?.gpa?.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Attendance & Result */}
      <div className="attendance-row">
        <div className="item">
          <span className="label">RESULT:</span>
          <span>{summary?.isPassed ? "PASSED" : "FAILED"}</span>
        </div>
        <div className="item">
          <span className="label">CLASS RANK:</span>
          <span>{summary?.classRank || "—"}</span>
        </div>
        <div className="item">
          <span className="label">REMARKS:</span>
          <span>{getRemarkText(summary?.grade) || "—"}</span>
        </div>
      </div>

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
          Date of Issue: {examination?.academicYearBS || "_______________"}
        </div>
      </section>

      {/* Footer */}
      <footer className="report-footer">
        {school?.landlineNumber && `Ph: ${school.landlineNumber}`}
        {school?.landlineNumber && school?.phone && ", "}
        {school?.phone && school.phone}
        {(school?.landlineNumber || school?.phone) && school?.email && " | "}
        {school?.email && `Email: ${school.email}`}
      </footer>
    </div>
  );
};

export default BulkReportCardPrint;
