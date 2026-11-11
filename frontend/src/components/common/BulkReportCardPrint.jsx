import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { Printer, X, Loader2 } from "lucide-react";
import ReportSheet from "./reportcard/ReportSheet";
import NEB_SHEET_CSS from "./reportcard/nebSheetStyles";
import usePrintIsolation from "./reportcard/usePrintIsolation";
import { Button } from "../ui/Button";

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

// Rendered under <body>, outside the page, so printing outputs only the cards
// (see usePrintIsolation).
const BulkReportCardPrint = (props) => {
  usePrintIsolation(true);
  return createPortal(<BulkPrintOverlay {...props} />, document.body);
};

const BulkPrintOverlay = ({ data, onClose, loading = false }) => {
  const printRef = useRef(null);

  if (loading) {
    return (
      <div className="bulk-print-overlay">
        <div className="bulk-print-loading">
          <Loader2 className="spin" size={48} />
          <p>Loading Report Cards...</p>
          <Button variant="secondary" icon={X} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (!data || !data.reportCards || data.reportCards.length === 0) {
    return (
      <div className="bulk-print-overlay">
        <div className="bulk-print-loading">
          <p>No report cards to display</p>
          <Button variant="secondary" icon={X} onClick={onClose}>
            Close
          </Button>
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
              className={`report-card-page report-card-container ${needsCompact ? "compact-mode" : ""}`}
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
          line-height: 1.4286;
          white-space: nowrap;
          justify-content: center;
          box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
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

        @media print {
          .no-print,
          .bulk-print-actions {
            display: none !important;
          }
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
        }
      `}</style>
      <style>{NEB_SHEET_CSS}</style>
    </div>
  );
};

/**
 * Single Report Card Component (simplified for bulk print)
 * @param {Object} data - Report card data
 * @param {boolean} compactMode - Whether to use compact styling for many subjects
 */
/**
 * One printed page. The sheet itself lives in ReportSheet; this wrapper only
 * owns the logo-fallback state and selects the bulk layout variant.
 */
const SingleReportCard = ({ data, compactMode = false }) => {
  const [logoError, setLogoError] = React.useState(false);

  return (
    <ReportSheet
      data={data}
      compact={compactMode}
      logoError={logoError}
      onLogoError={() => setLogoError(true)}
    />
  );
};

export default BulkReportCardPrint;
