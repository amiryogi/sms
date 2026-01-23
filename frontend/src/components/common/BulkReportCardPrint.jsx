import React, { useRef } from "react";
import { Printer, X, Loader2 } from "lucide-react";

/**
 * Bulk Report Card Print Component
 * Renders multiple report cards for printing with page breaks
 * Each student's report card fits on one A4 page
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

const BulkReportCardPrint = ({ 
  data, 
  onClose, 
  loading = false 
}) => {
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
          <strong>{examName}</strong> | {className} - {sectionName} | {reportCards.length} Students
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
        {reportCards.map((reportData, index) => (
          <div key={reportData.student?.id || index} className="report-card-page">
            <SingleReportCard data={reportData} />
          </div>
        ))}
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
        }

        /* Header */
        .report-header {
          text-align: center;
          margin-bottom: 8px;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
        }

        .report-header .school-logo {
          height: 50px;
          width: auto;
          margin-bottom: 4px;
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

        /* Attendance */
        .attendance-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 8px;
          border: 1px solid #000;
          margin: 8px 0;
          font-size: 9pt;
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
          margin-top: 12px;
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
        }

        /* Print Styles */
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .bulk-print-overlay {
            position: static;
            background: white;
            overflow: visible;
          }

          .bulk-print-container {
            padding: 0;
            gap: 0;
          }

          .report-card-page {
            page-break-after: always;
            page-break-inside: avoid;
            box-shadow: none;
          }

          .report-card-page:last-child {
            page-break-after: auto;
          }

          .report-a4 {
            width: 210mm;
            height: 297mm;
            padding: 10mm 12mm;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Single Report Card Component (simplified for bulk print)
 */
const SingleReportCard = ({ data }) => {
  if (!data) return null;

  const { school, examination, student, subjects, summary } = data;

  // Calculate total credit hours
  const totalCreditHours = subjects?.reduce((acc, s) => 
    acc + (parseFloat(s.theoryCreditHours) || 0) + (parseFloat(s.internalCreditHours) || 0), 0
  ) || 0;

  return (
    <div className="report-a4">
      {/* Header */}
      <header className="report-header">
        {school?.logoUrl && (
          <img 
            src={resolveAssetUrl(school.logoUrl)} 
            alt="School Logo" 
            className="school-logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
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
          <tr>
            <td colSpan="2" className="center bold">TOTAL</td>
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
