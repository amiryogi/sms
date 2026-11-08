import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { Printer, Download, X } from "lucide-react";
import ReportSheet from "./reportcard/ReportSheet";
import usePrintIsolation from "./reportcard/usePrintIsolation";

/**
 * Nepal-style Report Card Component
 * A4 printable format following Nepal school standards
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

const NepalReportCard = (props) => {
  // With a Close button this is a modal over the page: render it under <body>
  // and print only it. Without one (student/parent report-card pages) the page
  // shows it inline and handles printing itself.
  const isModal = Boolean(props.onClose);
  usePrintIsolation(isModal && Boolean(props.data));

  if (!props.data) return null;
  const card = <ReportCardOverlay {...props} />;
  return isModal ? createPortal(card, document.body) : card;
};

const ReportCardOverlay = ({ data, onClose, showActions = true }) => {
  const reportRef = useRef(null);

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
        <ReportSheet data={data} variant="single" />
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
          line-height: 1.4286;
          white-space: nowrap;
          justify-content: center;
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
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

          /* One A4 page. !important beats the student/parent pages' own
             on-screen .report-card-a4 shadow rule, which is also !important. */
          .report-card-container .report-card-a4 {
            width: 100%;
            min-height: auto;
            box-shadow: none !important;
            padding: 6mm 8mm;
            margin: 0;
          }

          /* Shown inline on the student/parent pages: drop the page's own
             padding so the card gets the full printable width. */
          .page-content,
          .page-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }

          .signature-section {
            margin-top: 14px;
            padding-top: 8px;
            break-inside: avoid;
          }

          .signature-grid {
            margin-bottom: 8px;
          }

          .report-footer {
            margin-top: 8px;
            padding-top: 6px;
          }

          @page {
            size: A4;
            margin: 8mm;
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
