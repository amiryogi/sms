/**
 * The one stylesheet for the NEB grade sheet (ReportSheet), shared by the
 * individual card, bulk print, the student/parent pages and the settings
 * preview. It is unlayered on purpose: A4 output must not depend on Tailwind's
 * layers (CLAUDE.md §9, print exception).
 *
 * Print geometry, for every caller: A4 with 8mm page margins; each sheet sits
 * in a .report-card-container; bulk wraps each one in a .report-card-page that
 * breaks to a new page.
 */
const NEB_SHEET_CSS = `
/* A4 Container */
.report-card-container {
  display: flex;
  justify-content: center;
}

/* Content wrapper that useFitToPage zooms to keep one page */
.rc-fit { display: flow-root; }

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
/* Same spacing on screen and paper, so the preview matches the print. */
.signature-section {
  margin-top: 14px;
  padding-top: 8px;
  break-inside: avoid;
}

.signature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  margin-bottom: 8px;
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
  margin-top: 8px;
  padding-top: 6px;
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

/* ==========================================================
   Design settings (School Settings -> Report Card -> Design).
   designVars.js sets these variables on .report-card-a4; each
   fallback is the value this sheet always used.
   ========================================================== */
.report-card-a4 {
  padding: var(--rc-margin-top, 15mm) var(--rc-margin-right, 15mm) var(--rc-margin-bottom, 15mm) var(--rc-margin-left, 15mm);
}
.report-card-a4,
.report-card-a4 * {
  font-family: var(--rc-font-family, var(--font-sans, sans-serif));
}
.report-header {
  margin-bottom: var(--rc-header-spacing, 15px);
  flex-direction: var(--rc-header-direction, row);
}
.school-logo,
.school-logo-balance {
  width: var(--rc-logo-width, 70px);
  height: var(--rc-logo-height, 70px);
  flex-shrink: 0;
  display: var(--rc-logo-display, block);
}
.school-info { text-align: var(--rc-header-align, center); }
.school-name {
  font-size: var(--rc-school-name-size, 22pt);
  font-weight: var(--rc-school-name-weight, bold);
  line-height: var(--rc-school-name-line-height, normal);
}
.school-address,
.school-tagline { font-size: var(--rc-address-size, 10pt); }
.school-contact,
.school-website { font-size: var(--rc-contact-size, 9pt); }
.report-title {
  text-align: var(--rc-title-align, center);
  margin: var(--rc-title-margin-top, 15px) 0 var(--rc-title-margin-bottom, 15px);
}
.report-title h2 {
  font-size: var(--rc-title-size, 16pt);
  font-weight: var(--rc-title-weight, 600);
}
.info-grid {
  grid-template-columns: repeat(var(--rc-info-columns, 4), 1fr);
  gap: var(--rc-info-gap, 10px);
}
.info-item .label { font-size: var(--rc-info-label-size, 9pt); }
.info-item .value { font-size: var(--rc-info-value-size, 11pt); }
.marks-table { font-size: var(--rc-table-font-size, 9pt); }
.marks-table thead th { font-size: var(--rc-table-header-size, inherit); }
.marks-table th,
.marks-table td {
  border-width: var(--rc-border-width, 1px);
  padding: var(--rc-row-padding, 6px) var(--rc-cell-padding-x, 4px);
}
.marks-table .subject-col { width: var(--rc-subject-width, auto); }
.marks-table .subject-name { text-align: var(--rc-subject-align, left); }
.marks-table .center { text-align: var(--rc-marks-align, center); }
.summary-item .label { font-size: var(--rc-summary-label-size, 8pt); }
.summary-item .value.large { font-size: var(--rc-gpa-size, 16pt); }
.signature-line { height: var(--rc-signature-height, 40px); }
.signature-label { font-size: var(--rc-signature-label-size, 9pt); }
.report-footer { font-size: var(--rc-footer-size, 8pt); }

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
    /* the page margin is 8mm (@page below); the rest of each margin is padding */
    padding: calc(var(--rc-margin-top, 15mm) - 8mm) calc(var(--rc-margin-right, 15mm) - 8mm)
      calc(var(--rc-margin-bottom, 15mm) - 8mm) calc(var(--rc-margin-left, 15mm) - 8mm);
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

  /* Bulk: one sheet per page, no blank page at the end */
  .report-card-page {
    break-after: page;
    page-break-after: always;
    break-inside: avoid;
    box-shadow: none;
  }
  .report-card-page:last-child {
    break-after: auto;
    page-break-after: auto;
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
`;

export default NEB_SHEET_CSS;
