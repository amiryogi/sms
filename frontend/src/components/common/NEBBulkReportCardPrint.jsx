import React, { useRef } from "react";
import { Printer, X, Loader2 } from "lucide-react";

/**
 * NEB Bulk Report Card Print Component for Grade 11-12
 * Renders multiple NEB-style grade sheets for printing with page breaks
 * Each student's grade sheet fits on one A4 page
 *
 * Key Features:
 * - Subject Code column (4-digit NEB codes)
 * - Theory (Th) / Internal (In) format
 * - Credit hours with decimal precision (2.25, 0.75)
 * - Compact mode for 8+ subjects (auto-detected)
 * - Theory+Internal rows kept together
 * - NEB footer notes
 * - Print-optimized fonts and spacing
 */

// Constants for layout calculations
const MAX_SUBJECTS_NORMAL = 7; // NEB typically has 6-8 subjects
const MAX_SUBJECTS_COMPACT = 10; // Compact mode can fit more

// Resolve asset URLs (handles relative backend paths)
const resolveAssetUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1$/, "")
    : window.location.origin;
  return `${base}/${url.replace(/^\\?/, "").replace(/^\//, "").replace(/\\/g, "/")}`;
};

// NEB Subject codes mapping (official NEB codes) - FALLBACK ONLY
const NEB_SUBJECT_CODES = {
  "Compulsory Nepali": { theory: "0011", internal: "0012" },
  "Comp. Nepali": { theory: "0011", internal: "0012" },
  Nepali: { theory: "0011", internal: "0012" },
  "Compulsory English": { theory: "0031", internal: "0032" },
  "Comp. English": { theory: "0031", internal: "0032" },
  English: { theory: "0031", internal: "0032" },
  "Compulsory Mathematics": { theory: "0071", internal: "0072" },
  "Comp. Mathematics": { theory: "0071", internal: "0072" },
  Mathematics: { theory: "0071", internal: "0072" },
  Physics: { theory: "1011", internal: "1012" },
  Chemistry: { theory: "3011", internal: "3012" },
  Biology: { theory: "1031", internal: "1032" },
  "Computer Science": { theory: "4271", internal: "4272" },
  Accountancy: { theory: "5011", internal: "5012" },
  Economics: { theory: "3031", internal: "3032" },
  "Business Studies": { theory: "2151", internal: "2152" },
  "Social Studies": { theory: "0051", internal: "0052" },
  "Hotel Management": { theory: "4391", internal: "4392" },
};

// Get subject codes from NEB mapping or generate based on subject
const getSubjectCodes = (subjectName, subjectCode) => {
  for (const [key, codes] of Object.entries(NEB_SUBJECT_CODES)) {
    if (subjectName?.toLowerCase().includes(key.toLowerCase())) {
      return codes;
    }
  }
  const baseCode = subjectCode || "9999";
  const numericCode = parseInt(baseCode.replace(/\D/g, "")) || 9999;
  return {
    theory: String(numericCode).padStart(4, "0"),
    internal: String(numericCode + 1).padStart(4, "0"),
  };
};

// NEB Credit Hours based on subject type
const getCreditHours = (subjectName) => {
  const normalizedName = subjectName?.toLowerCase() || "";
  if (normalizedName.includes("nepali"))
    return { theory: 2.25, internal: 0.75 };
  if (normalizedName.includes("english")) return { theory: 3.0, internal: 1.0 };
  if (normalizedName.includes("mathematics"))
    return { theory: 3.75, internal: 1.25 };
  return { theory: 3.75, internal: 1.25 }; // Default for electives
};

const NEBBulkReportCardPrint = ({ data, onClose, loading = false }) => {
  const printRef = useRef(null);

  if (loading) {
    return (
      <div className="neb-bulk-overlay">
        <div className="neb-bulk-loading">
          <Loader2 className="spin" size={48} />
          <p>Loading NEB Grade Sheets...</p>
          <button className="btn btn-outline" onClick={onClose}>
            <X size={16} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.reportCards || data.reportCards.length === 0) {
    return (
      <div className="neb-bulk-overlay">
        <div className="neb-bulk-loading">
          <p>No grade sheets to display</p>
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
    <div className="neb-bulk-overlay">
      {/* Action Buttons - Hidden when printing */}
      <div className="neb-bulk-actions no-print">
        <div className="neb-bulk-info">
          <strong>{examName}</strong> | {className} - {sectionName} |{" "}
          {reportCards.length} Students (NEB Grade Sheet)
        </div>
        <div className="neb-bulk-buttons">
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Print All ({reportCards.length})
          </button>
          <button className="btn btn-outline" onClick={onClose}>
            <X size={16} /> Close
          </button>
        </div>
      </div>

      {/* Print Container */}
      <div className="neb-bulk-container" ref={printRef}>
        {reportCards.map((reportData, index) => {
          const subjectCount = reportData.subjects?.length || 0;
          const needsCompact = subjectCount > MAX_SUBJECTS_NORMAL;

          return (
            <div
              key={reportData.student?.id || index}
              className={`neb-page ${needsCompact ? "compact-mode" : ""}`}
            >
              <SingleNEBGradeSheet
                data={reportData}
                compactMode={needsCompact}
              />
            </div>
          );
        })}
      </div>

      <style>{`
        /* ========================================
           NEB BULK PRINT OVERLAY
           ======================================== */
        .neb-bulk-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #f1f5f9;
          z-index: 1000;
          overflow-y: auto;
        }

        .neb-bulk-loading {
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
        .neb-bulk-actions {
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

        .neb-bulk-info {
          font-size: 1rem;
          color: #334155;
        }

        .neb-bulk-buttons {
          display: flex;
          gap: 0.75rem;
        }

        .neb-bulk-buttons .btn {
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

        .neb-bulk-buttons .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .neb-bulk-buttons .btn-outline {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        /* Container */
        .neb-bulk-container {
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        /* Each Grade Sheet Page */
        .neb-page {
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        /* ========================================
           NEB A4 GRADE SHEET STYLES
           ======================================== */
        .neb-a4 {
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

        /* Header - 3 column layout */
        .neb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 3px double #000;
          padding-bottom: 8px;
          margin-bottom: 10px;
          flex-shrink: 0;
        }

        .neb-logo {
          width: 60px;
          height: 60px;
          flex-shrink: 0;
        }

        .neb-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .logo-placeholder {
          width: 60px;
          height: 60px;
          font-size: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          border: 1px solid #000;
        }

        .logo-placeholder.nepal-emblem {
          border: none;
          background: transparent;
        }

        .neb-school-info {
          text-align: center;
          flex: 1;
          padding: 0 15px;
        }

        .neb-school-info .school-name {
          font-size: 18pt;
          font-weight: bold;
          margin: 0;
          text-transform: uppercase;
        }

        .neb-school-info .school-tagline {
          font-size: 9pt;
          font-style: italic;
          margin: 2px 0;
        }

        .neb-school-info .school-address {
          font-size: 9pt;
          margin: 2px 0;
        }

        .neb-school-info .school-contact {
          font-size: 8pt;
          margin: 0;
        }

        /* Report Title */
        .neb-title {
          text-align: center;
          margin: 8px 0;
          padding: 6px;
          border: 1px solid #000;
          flex-shrink: 0;
        }

        .neb-title h2 {
          font-size: 14pt;
          font-weight: bold;
          margin: 0;
          letter-spacing: 1px;
        }

        .neb-title h3 {
          font-size: 11pt;
          font-weight: normal;
          margin: 3px 0 0;
        }

        .neb-title .academic-year {
          font-size: 9pt;
          margin: 2px 0 0;
        }

        /* Student Info */
        .neb-student-info {
          margin: 8px 0;
          padding: 6px;
          border: 1px solid #000;
          flex-shrink: 0;
        }

        .neb-student-info .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px 12px;
          font-size: 9pt;
        }

        .neb-student-info .info-item {
          display: flex;
          gap: 4px;
        }

        .neb-student-info .label {
          font-weight: bold;
        }

        /* ========================================
           NEB MARKS TABLE WITH SUBJECT CODES
           CRITICAL: Explicit line-height prevents PDF vertical expansion
           ======================================== */
        .neb-table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
          font-size: 9pt;
          margin: 8px 0;
          flex-grow: 1;
          table-layout: fixed; /* Predictable column widths */
        }

        .neb-table th,
        .neb-table td {
          border: 1px solid #000;
          padding: 2px 3px;
          line-height: 1.1; /* CRITICAL: Prevents PDF row expansion */
          box-sizing: border-box;
          vertical-align: top; /* top is more predictable than middle for PDF */
          margin: 0;
          overflow: hidden;
        }

        .neb-table tr {
          height: auto;
          max-height: 18px; /* Constrain row height */
        }

        .neb-table thead th {
          background: #fff;
          font-weight: bold;
          text-align: center;
          font-size: 8pt;
          vertical-align: middle; /* OK for header */
          line-height: 1.0;
          padding: 2px 2px;
        }

        .neb-table .code-col { width: 45px; }
        .neb-table .subject-col { width: auto; min-width: 90px; }
        .neb-table .marks-col { width: 45px; }
        .neb-table .ch-col { width: 45px; }
        .neb-table .gp-col { width: 45px; }
        .neb-table .grade-col { width: 38px; }
        .neb-table .fg-col { width: 45px; }
        .neb-table .remarks-col { width: 55px; }

        .neb-table .center { text-align: center; }
        .neb-table .bold { font-weight: bold; }

        .neb-table .subject-name {
          padding-left: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Use thin border instead of none - PDF handles this better */
        .neb-table .theory-row td {
          border-bottom-width: 0.5px;
          border-bottom-color: #999;
        }

        .neb-table .internal-row td {
          border-top-width: 0.5px;
          border-top-color: #999;
        }

        /* rowSpan cells - use top alignment to prevent height expansion */
        .neb-table .fg-cell,
        .neb-table .remarks-cell {
          vertical-align: middle;
          line-height: 1.0;
        }

        .neb-table .fg-cell {
          font-weight: bold;
        }

        .neb-table .remarks-cell {
          font-size: 7pt;
        }

        /* Subject group for page-break control */
        .neb-table .subject-group {
          page-break-inside: avoid;
        }

        .neb-table tfoot td {
          font-weight: bold;
          padding: 3px 3px;
          line-height: 1.1;
        }

        /* Result Row */
        .neb-result-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 8px;
          border: 1px solid #000;
          margin: 6px 0;
          font-size: 9pt;
          flex-shrink: 0;
          line-height: 1.1;
        }

        .neb-result-row .item {
          display: flex;
          gap: 6px;
        }

        .neb-result-row .label {
          font-weight: bold;
        }

        /* Signature Section */
        .neb-signature {
          display: flex;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 8px;
          font-size: 9pt;
          flex-shrink: 0;
          line-height: 1.2;
        }

        .neb-signature .signature-left {
          flex: 1;
        }

        .neb-signature .signature-left p {
          margin: 3px 0;
        }

        .neb-signature .signature-gap {
          margin-top: 8px !important;
        }

        .neb-signature .signature-right {
          text-align: center;
        }

        .neb-signature .dotted {
          letter-spacing: 1px;
          margin-bottom: 2px;
        }

        .neb-signature .campus-chief-name {
          font-weight: bold;
          margin: 0;
        }

        .neb-signature .title-label {
          font-weight: bold;
          margin: 0;
        }

        /* Footer - NEB Notes */
        .neb-footer {
          margin-top: 6px;
          font-size: 7.5pt;
          border-top: 1px solid #000;
          padding-top: 4px;
          flex-shrink: 0;
          line-height: 1.2;
        }

        .neb-footer p {
          margin: 1px 0;
        }

        .neb-footer .indent {
          padding-left: 4rem;
        }

        /* ========================================
           COMPACT MODE - For 8+ subjects
           ======================================== */
        .compact-mode .neb-a4,
        .neb-a4.compact {
          padding: 8mm 10mm;
        }

        .compact-mode .neb-header,
        .neb-a4.compact .neb-header {
          padding-bottom: 5px;
          margin-bottom: 6px;
        }

        .compact-mode .neb-logo,
        .neb-a4.compact .neb-logo {
          width: 50px;
          height: 50px;
        }

        .compact-mode .logo-placeholder,
        .neb-a4.compact .logo-placeholder {
          width: 50px;
          height: 50px;
          font-size: 28px;
        }

        .compact-mode .neb-school-info .school-name,
        .neb-a4.compact .neb-school-info .school-name {
          font-size: 15pt;
        }

        .compact-mode .neb-school-info .school-address,
        .compact-mode .neb-school-info .school-tagline,
        .neb-a4.compact .neb-school-info .school-address,
        .neb-a4.compact .neb-school-info .school-tagline {
          font-size: 8pt;
        }

        .compact-mode .neb-school-info .school-contact,
        .neb-a4.compact .neb-school-info .school-contact {
          font-size: 7pt;
        }

        .compact-mode .neb-title,
        .neb-a4.compact .neb-title {
          margin: 5px 0;
          padding: 4px;
        }

        .compact-mode .neb-title h2,
        .neb-a4.compact .neb-title h2 {
          font-size: 12pt;
        }

        .compact-mode .neb-title h3,
        .neb-a4.compact .neb-title h3 {
          font-size: 10pt;
        }

        .compact-mode .neb-student-info,
        .neb-a4.compact .neb-student-info {
          margin: 5px 0;
          padding: 4px;
        }

        .compact-mode .neb-student-info .info-grid,
        .neb-a4.compact .neb-student-info .info-grid {
          gap: 2px 8px;
          font-size: 8pt;
        }

        .compact-mode .neb-table,
        .neb-a4.compact .neb-table {
          font-size: 7.5pt;
          margin: 4px 0;
        }

        .compact-mode .neb-table th,
        .compact-mode .neb-table td,
        .neb-a4.compact .neb-table th,
        .neb-a4.compact .neb-table td {
          padding: 1.5px 2px;
          line-height: 1.0;
        }

        .compact-mode .neb-table thead th,
        .neb-a4.compact .neb-table thead th {
          font-size: 6.5pt;
          line-height: 1.0;
        }

        .compact-mode .neb-table .remarks-cell,
        .neb-a4.compact .neb-table .remarks-cell {
          font-size: 5.5pt;
        }

        .compact-mode .neb-result-row,
        .neb-a4.compact .neb-result-row {
          padding: 4px 6px;
          margin: 5px 0;
          font-size: 8pt;
        }

        .compact-mode .neb-signature,
        .neb-a4.compact .neb-signature {
          padding-top: 6px;
          font-size: 8pt;
        }

        .compact-mode .neb-signature .signature-gap,
        .neb-a4.compact .neb-signature .signature-gap {
          margin-top: 8px !important;
        }

        .compact-mode .neb-footer,
        .neb-a4.compact .neb-footer {
          margin-top: 6px;
          font-size: 7pt;
          padding-top: 3px;
        }

        /* ========================================
           PRINT STYLES - A4 Optimization
           ======================================== */
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .no-print,
          .neb-bulk-actions {
            display: none !important;
          }

          .neb-bulk-overlay {
            position: static;
            background: white;
            overflow: visible;
            padding: 0;
          }

          .neb-bulk-container {
            padding: 0;
            gap: 0;
            display: block;
          }

          .neb-page {
            page-break-after: always;
            page-break-inside: avoid;
            break-after: page;
            break-inside: avoid;
            box-shadow: none;
            margin: 0;
            padding: 0;
          }

          .neb-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .neb-a4 {
            width: 210mm;
            height: 297mm;
            padding: 8mm 10mm;
            box-shadow: none;
            margin: 0;
            overflow: hidden;
          }

          /* Header print */
          .neb-header {
            border-bottom: 2px solid #000 !important;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }

          .neb-logo {
            width: 55px;
            height: 55px;
          }

          .logo-placeholder {
            width: 55px;
            height: 55px;
            font-size: 32px;
          }

          .neb-school-info .school-name {
            font-size: 16pt;
          }

          .neb-school-info .school-address,
          .neb-school-info .school-tagline {
            font-size: 8pt;
          }

          .neb-school-info .school-contact {
            font-size: 7pt;
          }

          /* Title print */
          .neb-title {
            border: 1.5px solid #000 !important;
            margin: 6px 0;
            padding: 5px;
          }

          .neb-title h2 {
            font-size: 12pt;
          }

          .neb-title h3 {
            font-size: 10pt;
          }

          /* Student info print */
          .neb-student-info {
            border: 1.5px solid #000 !important;
            margin: 5px 0;
            padding: 5px;
          }

          .neb-student-info .info-grid {
            font-size: 8pt;
            gap: 3px 10px;
          }

          /* Table print - CRITICAL: Explicit constraints for PDF */
          .neb-table {
            font-size: 8pt;
            margin: 4px 0;
            border: 1.5px solid #000 !important;
            border-spacing: 0 !important;
            table-layout: fixed !important;
          }

          .neb-table th,
          .neb-table td {
            border: 1px solid #000 !important;
            padding: 1.5px 2px !important;
            line-height: 1.0 !important; /* CRITICAL for PDF */
            box-sizing: border-box !important;
            vertical-align: top !important;
            margin: 0 !important;
            overflow: hidden !important;
          }

          .neb-table tr {
            height: auto !important;
            max-height: 16px !important;
            line-height: 1.0 !important;
          }

          .neb-table thead {
            display: table-header-group;
          }

          .neb-table thead th {
            font-size: 7pt;
            background: #fff !important;
            padding: 1.5px 1px !important;
            line-height: 1.0 !important;
            vertical-align: middle !important;
          }

          /* Thin borders between theory/internal rows */
          .neb-table .theory-row td {
            border-bottom: 0.5px solid #999 !important;
          }

          .neb-table .internal-row td {
            border-top: 0.5px solid #999 !important;
          }

          /* rowSpan cells */
          .neb-table .fg-cell,
          .neb-table .remarks-cell {
            vertical-align: middle !important;
            line-height: 1.0 !important;
          }

          .neb-table .subject-group {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .neb-table .theory-row {
            page-break-after: avoid;
            break-after: avoid;
          }

          .neb-table .internal-row {
            page-break-before: avoid;
            break-before: avoid;
          }

          .neb-table tfoot {
            display: table-footer-group;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .neb-table tfoot td {
            border-top: 1.5px solid #000 !important;
            padding: 2px 2px !important;
            line-height: 1.0 !important;
          }

          .neb-table .remarks-cell {
            font-size: 6pt;
          }

          /* Column widths for print */
          .neb-table .code-col { width: 40px; }
          .neb-table .subject-col { min-width: 80px; }
          .neb-table .marks-col { width: 40px; }
          .neb-table .ch-col { width: 40px; }
          .neb-table .gp-col { width: 40px; }
          .neb-table .grade-col { width: 35px; }
          .neb-table .fg-col { width: 40px; }
          .neb-table .remarks-col { width: 50px; }

          /* Result row print */
          .neb-result-row {
            border: 1.5px solid #000 !important;
            margin: 5px 0;
            padding: 4px 6px;
            font-size: 8pt;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Signature print */
          .neb-signature {
            margin-top: auto;
            padding-top: 8px;
            font-size: 8pt;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: avoid;
            break-before: avoid;
          }

          .neb-signature .signature-gap {
            margin-top: 10px !important;
          }

          /* Footer print */
          .neb-footer {
            border-top: 1px solid #000 !important;
            margin-top: 6px;
            padding-top: 3px;
            font-size: 7pt;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Compact mode print */
          .compact-mode .neb-a4,
          .neb-a4.compact {
            padding: 6mm 8mm;
          }

          .compact-mode .neb-logo,
          .neb-a4.compact .neb-logo {
            width: 45px;
            height: 45px;
          }

          .compact-mode .logo-placeholder,
          .neb-a4.compact .logo-placeholder {
            width: 45px;
            height: 45px;
            font-size: 24px;
          }

          .compact-mode .neb-school-info .school-name,
          .neb-a4.compact .neb-school-info .school-name {
            font-size: 13pt;
          }

          .compact-mode .neb-title h2,
          .neb-a4.compact .neb-title h2 {
            font-size: 10pt;
          }

          .compact-mode .neb-title h3,
          .neb-a4.compact .neb-title h3 {
            font-size: 9pt;
          }

          .compact-mode .neb-student-info .info-grid,
          .neb-a4.compact .neb-student-info .info-grid {
            font-size: 7pt;
          }

          .compact-mode .neb-table,
          .neb-a4.compact .neb-table {
            font-size: 7pt;
          }

          .compact-mode .neb-table th,
          .compact-mode .neb-table td,
          .neb-a4.compact .neb-table th,
          .neb-a4.compact .neb-table td {
            padding: 2px 1px;
          }

          .compact-mode .neb-table thead th,
          .neb-a4.compact .neb-table thead th {
            font-size: 6pt;
          }

          .compact-mode .neb-result-row,
          .neb-a4.compact .neb-result-row {
            font-size: 7pt;
            padding: 3px 4px;
          }

          .compact-mode .neb-signature,
          .neb-a4.compact .neb-signature {
            font-size: 7pt;
          }

          .compact-mode .neb-footer,
          .neb-a4.compact .neb-footer {
            font-size: 6pt;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Single NEB Grade Sheet Component
 */
const SingleNEBGradeSheet = ({ data, compactMode = false }) => {
  const [logoError, setLogoError] = React.useState(false);

  if (!data) return null;

  const { school, examination, student, subjects, summary } = data;

  // Process subjects with NEB codes
  const processedSubjects =
    subjects?.map((subj) => {
      const codes = getSubjectCodes(subj.subjectName, subj.subjectCode);
      const defaultCredits = getCreditHours(subj.subjectName);

      return {
        ...subj,
        theoryCode: subj.theorySubjectCode || subj.theoryCode || codes.theory,
        internalCode:
          subj.practicalSubjectCode || subj.internalCode || codes.internal,
        theoryCreditHours:
          parseFloat(subj.theoryCreditHours) || defaultCredits.theory,
        internalCreditHours:
          parseFloat(subj.internalCreditHours) || defaultCredits.internal,
        // Obtained marks for the new column
        theoryMarksObtained:
          subj.theoryMarks ?? subj.theoryMarksObtained ?? "—",
        internalMarksObtained:
          subj.practicalMarks ??
          subj.internalMarks ??
          subj.internalMarksObtained ??
          "—",
        theoryFullMarks: subj.theoryFullMarks ?? subj.fullMarks ?? 75,
        internalFullMarks:
          subj.practicalFullMarks ?? subj.internalFullMarks ?? 25,
      };
    }) || [];

  // Calculate total credit hours
  const totalCreditHours = processedSubjects.reduce(
    (acc, s) => acc + s.theoryCreditHours + s.internalCreditHours,
    0,
  );

  return (
    <div className={`neb-a4 ${compactMode ? "compact" : ""}`}>
      {/* Header with 3-column layout */}
      <header className="neb-header">
        <div className="neb-logo">
          {school?.logoUrl && !logoError ? (
            <img
              src={resolveAssetUrl(school.logoUrl)}
              alt="School Logo"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="logo-placeholder">🏫</div>
          )}
        </div>
        <div className="neb-school-info">
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
        </div>
        <div className="neb-logo">
          <div className="logo-placeholder nepal-emblem">🇳🇵</div>
        </div>
      </header>

      {/* Report Title */}
      <div className="neb-title">
        <h2>GRADE SHEET / REPORT CARD</h2>
        <h3>{examination?.name || "Examination"}</h3>
        <p className="academic-year">
          Academic Year: {examination?.academicYear || "N/A"}
        </p>
      </div>

      {/* Student Info */}
      <section className="neb-student-info">
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

      {/* Marks Table with Subject Codes */}
      <table className="neb-table">
        <thead>
          <tr>
            <th className="code-col">
              SUBJECT
              <br />
              CODE
            </th>
            <th className="subject-col">SUBJECTS</th>
            <th className="marks-col">
              OBTAINED
              <br />
              MARKS
            </th>
            <th className="ch-col">
              CREDIT
              <br />
              HOURS
              <br />
              (CH)
            </th>
            <th className="gp-col">
              GRADE
              <br />
              POINT
              <br />
              (GP)
            </th>
            <th className="grade-col">GRADE</th>
            <th className="fg-col">
              FINAL
              <br />
              GRADE
              <br />
              (FG)
            </th>
            <th className="remarks-col">REMARKS</th>
          </tr>
        </thead>
        {processedSubjects.map((subject, index) => (
          <tbody key={subject.subjectId || index} className="subject-group">
            {/* Theory Row */}
            <tr className="theory-row">
              <td className="center bold">{subject.theoryCode}</td>
              <td className="subject-name">{subject.subjectName} (Th)</td>
              <td className="center">
                {subject.isAbsent ? "AB" : subject.theoryMarksObtained}
              </td>
              <td className="center">{subject.theoryCreditHours.toFixed(2)}</td>
              <td className="center">
                {subject.isAbsent ? "AB" : subject.theoryGpa?.toFixed(1) || "—"}
              </td>
              <td className="center">
                {subject.isAbsent ? "AB" : subject.theoryGrade || "—"}
              </td>
              <td rowSpan={2} className="center bold fg-cell">
                {subject.isAbsent ? "AB" : subject.finalGrade || "—"}
              </td>
              <td rowSpan={2} className="center remarks-cell">
                {subject.isAbsent ? "ABSENT" : ""}
              </td>
            </tr>
            {/* Internal Row */}
            <tr className="internal-row">
              <td className="center bold">{subject.internalCode}</td>
              <td className="subject-name">{subject.subjectName} (In)</td>
              <td className="center">
                {subject.isAbsent ? "AB" : subject.internalMarksObtained}
              </td>
              <td className="center">
                {subject.internalCreditHours.toFixed(2)}
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
          </tbody>
        ))}
        <tfoot>
          <tr>
            <td colSpan="3" className="center bold">
              Grade Point Average (GPA)
            </td>
            <td className="center bold">{totalCreditHours.toFixed(2)}</td>
            <td colSpan="2"></td>
            <td className="center bold">
              {summary?.gpa?.toFixed(2) || "0.00"}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      {/* Result Row */}
      <div className="neb-result-row">
        <div className="item">
          <span className="label">RESULT:</span>
          <span>{summary?.isPassed ? "PASSED" : "FAILED"}</span>
        </div>
        <div className="item">
          <span className="label">CLASS RANK:</span>
          <span>{summary?.classRank || "—"}</span>
        </div>
      </div>

      {/* Signature Section */}
      <section className="neb-signature">
        <div className="signature-left">
          <p>PREPARED BY:-..............................................</p>
          <p className="signature-gap">
            CHECKED BY:-...............................................
          </p>
          <p className="signature-gap">
            DATE OF ISSUE:-{" "}
            <span className="bold">
              {examination?.issueDateBS || "____-__-__"} B.S.
            </span>
          </p>
        </div>
        <div className="signature-right">
          <p className="dotted">........................................</p>
          <p className="campus-chief-name">
            {school?.principalName || "PRINCIPAL"}
          </p>
          <p className="title-label">CAMPUS CHIEF</p>
        </div>
      </section>

      {/* Footer - NEB Notes */}
      <footer className="neb-footer">
        <p>
          <strong>Note:</strong> 1 Credit Hour is equal to 32 working hours.
        </p>
        <p>
          IN (Internal): Project work, Practical, Presentation, Community Work,
          Terminal Examinations
        </p>
        <p>TH (Theory): Written External Examination</p>
      </footer>
    </div>
  );
};

export default NEBBulkReportCardPrint;
