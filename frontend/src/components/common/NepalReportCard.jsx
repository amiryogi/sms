import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { Printer, Download, X } from "lucide-react";
import ReportSheet from "./reportcard/ReportSheet";
import NEB_SHEET_CSS from "./reportcard/nebSheetStyles";
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
        <ReportSheet data={data} />
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
      `}</style>
      <style>{NEB_SHEET_CSS}</style>
    </div>
  );
};

export default NepalReportCard;
