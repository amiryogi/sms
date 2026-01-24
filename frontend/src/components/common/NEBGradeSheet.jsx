import React, { useRef } from "react";
import { Printer, Download, X } from "lucide-react";

/**
 * NEB-style Grade Sheet Component for Grade 11/12
 * Matches the official NEB grading format with:
 * - Separate Theory (Th) and Internal (In) rows per subject
 * - Subject codes, Credit Hours, Grade Points
 * - Final Grade spanning both component rows
 * - B.S./A.D. date formatting
 *
 * Based on official NEB Grade Sheet format from Nepal Education Board
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

// NEB Subject codes mapping (official NEB codes) - FALLBACK ONLY
// The backend API should provide theorySubjectCode/practicalSubjectCode from SubjectComponent table
// This mapping is only used if the API doesn't provide codes
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
  "Social Studies & Life Skills": { theory: "0051", internal: "0052" },
  "Hotel Management": { theory: "4391", internal: "4392" },
};

// NEB Credit Hours based on subject type
const getCreditHours = (subjectName) => {
  // Compulsory subjects: Theory 2.25-3.75, Internal 0.75-1.25
  // Elective subjects: Theory 3.75, Internal 1.25
  const normalizedName = subjectName?.toLowerCase() || "";

  if (
    normalizedName.includes("nepali") ||
    normalizedName.includes("comp. nepali")
  ) {
    return { theory: 2.25, internal: 0.75 };
  }
  if (
    normalizedName.includes("english") ||
    normalizedName.includes("comp. english")
  ) {
    return { theory: 3.0, internal: 1.0 };
  }
  if (
    normalizedName.includes("mathematics") ||
    normalizedName.includes("comp. math")
  ) {
    return { theory: 3.75, internal: 1.25 };
  }
  // Elective science/commerce subjects
  return { theory: 3.75, internal: 1.25 };
};

// Get subject codes from NEB mapping or generate based on subject
const getSubjectCodes = (subjectName, subjectCode) => {
  // Check if exact match exists in mapping
  for (const [key, codes] of Object.entries(NEB_SUBJECT_CODES)) {
    if (subjectName?.toLowerCase().includes(key.toLowerCase())) {
      return codes;
    }
  }
  // Fallback: use provided code or generate
  const baseCode = subjectCode || "9999";
  const numericCode = parseInt(baseCode.replace(/\D/g, "")) || 9999;
  return {
    theory: String(numericCode).padStart(4, "0"),
    internal: String(numericCode + 1).padStart(4, "0"),
  };
};

const NEBGradeSheet = ({ data, onClose, showActions = true }) => {
  const reportRef = useRef(null);

  if (!data) return null;

  const { school, examination, student, subjects, summary } = data;

  const handlePrint = () => {
    window.print();
  };

  // Group subjects with their components (Theory + Internal/Practical)
  // Following exact NEB format from the template
  const groupedSubjects = [];
  if (subjects) {
    subjects.forEach((subj) => {
      // IMPORTANT: Use theorySubjectCode/practicalSubjectCode from backend API
      // These contain the correct NEB codes from SubjectComponent table
      // Only fall back to hardcoded mapping if API doesn't provide codes
      const codes = getSubjectCodes(subj.subjectName, subj.subjectCode);
      const credits = getCreditHours(subj.subjectName);

      // Use actual credit hours if provided, otherwise use calculated
      const theoryCH =
        subj.theoryCreditHours || subj.creditHours * 0.75 || credits.theory;
      const internalCH =
        subj.internalCreditHours || subj.creditHours * 0.25 || credits.internal;

      groupedSubjects.push({
        subjectName: subj.subjectName,
        // Priority: API theorySubjectCode > API subjectCode > hardcoded mapping
        theoryCode:
          subj.theorySubjectCode ||
          subj.theoryCode ||
          subj.subjectCode ||
          codes.theory,
        internalCode:
          subj.practicalSubjectCode || subj.internalCode || codes.internal,
        theoryCreditHours: parseFloat(theoryCH) || credits.theory,
        internalCreditHours: parseFloat(internalCH) || credits.internal,
        theoryGradePoint: parseFloat(subj.theoryGpa) || 0,
        internalGradePoint: parseFloat(subj.practicalGpa) || 0,
        theoryGrade: subj.theoryGrade || "NG",
        internalGrade: subj.practicalGrade || subj.internalGrade || "NG",
        finalGrade: subj.finalGrade || "NG",
        hasPractical: subj.hasPractical !== false,
        isAbsent: subj.isAbsent,
        // Obtained marks for new column
        theoryMarksObtained:
          subj.theoryMarks ?? subj.theoryMarksObtained ?? "—",
        internalMarksObtained:
          subj.practicalMarks ??
          subj.internalMarks ??
          subj.internalMarksObtained ??
          "—",
      });
    });
  }

  // Calculate total credit hours (for reference, used in footer if needed)
  const _totalCreditHours = groupedSubjects.reduce(
    (sum, subj) => sum + subj.theoryCreditHours + subj.internalCreditHours,
    0,
  );

  // Format grade level display (for future use)
  const _getGradeDisplay = (level) => {
    const num = parseInt(level);
    if (num === 11) return "XI";
    if (num === 12) return "XII";
    return level || "XI";
  };

  return (
    <div className="neb-grade-overlay">
      {/* Action Buttons */}
      {showActions && (
        <div className="neb-actions no-print">
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={18} /> Print
          </button>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Download size={18} /> Download PDF
          </button>
          {onClose && (
            <button className="btn btn-outline" onClick={onClose}>
              <X size={18} /> Close
            </button>
          )}
        </div>
      )}

      {/* Grade Sheet - A4 Format */}
      <div className="neb-container" ref={reportRef}>
        <div className="neb-a4">
          {/* Header Section - Same as Grade 1-10 Report Card */}
          <header className="report-header">
            <div className="school-logo">
              {school?.logoUrl || school?.bannerUrl ? (
                <img
                  src={resolveAssetUrl(school.logoUrl || school.bannerUrl)}
                  alt="School Logo"
                  crossOrigin="anonymous"
                />
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

          {/* Student Information - Same as Grade 1-10 Report Card */}
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

          {/* Marks Table - Exact NEB Format */}
          <section className="neb-table-section">
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
                  <th className="final-col">
                    FINAL
                    <br />
                    GRADE
                    <br />
                    (FG)
                  </th>
                  <th className="remarks-col">REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {groupedSubjects.map((subj, idx) => (
                  <React.Fragment key={idx}>
                    {/* Theory Row */}
                    <tr className="theory-row">
                      <td className="center bold">{subj.theoryCode}</td>
                      <td className="bold">{subj.subjectName} (Th)</td>
                      <td className="center">
                        {subj.isAbsent ? "AB" : subj.theoryMarksObtained}
                      </td>
                      <td className="center bold">
                        {subj.theoryCreditHours.toFixed(2)}
                      </td>
                      <td className="center bold">
                        {subj.isAbsent
                          ? "AB"
                          : subj.theoryGradePoint.toFixed(1)}
                      </td>
                      <td className="center bold">
                        {subj.isAbsent ? "AB" : subj.theoryGrade}
                      </td>
                      <td className="center bold final-grade" rowSpan="2">
                        {subj.finalGrade}
                      </td>
                      <td rowSpan="2"></td>
                    </tr>
                    {/* Internal/Practical Row */}
                    <tr className="internal-row">
                      <td className="center bold">{subj.internalCode}</td>
                      <td className="bold">{subj.subjectName} (In)</td>
                      <td className="center">
                        {subj.isAbsent ? "AB" : subj.internalMarksObtained}
                      </td>
                      <td className="center bold">
                        {subj.internalCreditHours.toFixed(2)}
                      </td>
                      <td className="center bold">
                        {subj.isAbsent
                          ? "AB"
                          : subj.internalGradePoint.toFixed(1)}
                      </td>
                      <td className="center bold">
                        {subj.isAbsent ? "AB" : subj.internalGrade}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="gpa-row">
                  <td colSpan="6" className="right bold">
                    Grade Point Average (GPA)
                  </td>
                  <td className="center bold gpa-value">
                    {summary?.gpa?.toFixed(2) || "0.00"}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </section>

          {/* Signature Section - NEB Format */}
          <section className="neb-signature">
            <div className="signature-left">
              <p>
                PREPARED BY:-..................................................
              </p>
              <p className="signature-gap">
                CHECKED BY:-..................................................
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
              <p className="bold campus-chief-name">
                {school?.principalName || "CAMPUS CHIEF NAME"}
              </p>
              <p className="title-label">CAMPUS CHIEF</p>
            </div>
          </section>

          {/* Footer Notes - NEB Format */}
          <footer className="neb-footer">
            <p>
              <strong>Note :</strong> 1 Credit Hour is equal to 32 working
              hours.
            </p>
            <p>
              IN (Internal) : Project work, Practical, Presentation, Community
              Work, Presentation,
            </p>
            <p className="indent">Terminal Examinations</p>
            <p>TH (Theory): Written External Examination</p>
          </footer>
        </div>
      </div>

      {/* Styles - NEB Official Format */}
      <style>{`
        .neb-grade-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          z-index: 1000;
          overflow-y: auto;
          padding: 20px;
        }

        .neb-actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 1rem;
          position: sticky;
          top: 0;
          z-index: 1001;
        }

        .neb-actions .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }

        .neb-actions .btn-primary { background: #3b82f6; color: white; }
        .neb-actions .btn-secondary { background: #10b981; color: white; }
        .neb-actions .btn-outline { background: white; color: #374151; border: 1px solid #d1d5db; }

        .neb-container {
          display: flex;
          justify-content: center;
        }

        .neb-a4 {
          width: 210mm;
          min-height: 297mm;
          background: white;
          padding: 15mm 20mm;
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          color: #000;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        /* Header - Same as Grade 1-10 */
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
          flex-shrink: 0;
        }

        .school-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .school-logo.right-logo {
          width: 70px;
          height: 70px;
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

        .school-tagline {
          font-size: 10pt;
          font-style: italic;
          color: #000;
          margin: 3px 0;
        }

        .school-address {
          font-size: 10pt;
          margin: 5px 0;
          color: #000;
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
        }

        /* Student Info Section */
        .student-info-section {
          margin: 15px 0;
          padding: 10px;
          background: #fff;
          border: 1px solid #000;
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

        /* Header - Centered (legacy) */
        .neb-header {
          text-align: center;
          margin-bottom: 0.5rem;
        }

        .neb-logo {
          display: inline-block;
          width: 70px;
          height: 70px;
          margin-bottom: 0.5rem;
        }

        .neb-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .logo-placeholder {
          width: 70px;
          height: 70px;
          font-size: 40px;
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

        .neb-school-info h1 {
          font-size: 24pt;
          font-weight: bold;
          margin: 0;
          font-family: 'Times New Roman', Times, serif;
        }

        .neb-school-info .location {
          font-size: 14pt;
          font-style: italic;
          margin: 4px 0;
          font-family: 'Calibri Light', 'Times New Roman', serif;
        }

        .neb-school-info .title {
          font-size: 16pt;
          font-weight: bold;
          margin: 10px 0 0;
          letter-spacing: 1px;
          font-family: 'Arial Black', Arial, sans-serif;
        }

        /* Student Info - NEB Format */
        .neb-student-info {
          margin: 1rem 0 1.5rem;
          font-size: 14pt;
          padding-left: 1rem;
        }

        .neb-student-info .info-row {
          margin: 6px 0;
          line-height: 1.5;
        }

        .neb-student-info .label {
          margin-right: 0.5rem;
        }

        .neb-student-info .value.bold {
          font-weight: bold;
        }

        .neb-student-info .three-col {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .neb-student-info .three-col > div {
          display: flex;
          gap: 0.5rem;
          align-items: baseline;
        }

        /* Table - NEB Format */
        .neb-table-section {
          margin: 1rem 0;
        }

        .neb-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12pt;
        }

        .neb-table th,
        .neb-table td {
          border: 1px solid #000;
          padding: 6px 8px;
        }

        .neb-table th {
          background: #fff;
          font-weight: bold;
          text-align: center;
          font-size: 12pt;
          vertical-align: middle;
        }

        .neb-table .code-col { width: 70px; }
        .neb-table .subject-col { width: 160px; text-align: left; }
        .neb-table .marks-col { width: 60px; }
        .neb-table .ch-col { width: 60px; }
        .neb-table .gp-col { width: 60px; }
        .neb-table .grade-col { width: 55px; }
        .neb-table .final-col { width: 60px; }
        .neb-table .remarks-col { width: 70px; }

        .neb-table .center { text-align: center; }
        .neb-table .right { text-align: right; padding-right: 1rem; }
        .neb-table .bold { font-weight: bold; }

        .neb-table .theory-row td,
        .neb-table .internal-row td {
          vertical-align: middle;
          padding: 4px 8px;
        }

        .neb-table .final-grade {
          vertical-align: middle;
          font-size: 12pt;
        }

        .neb-table .gpa-row td {
          padding: 8px;
          border-top: 2px solid #000;
        }

        .neb-table .gpa-value {
          font-size: 14pt;
          font-weight: bold;
        }

        /* Signature - NEB Format */
        .neb-signature {
          display: flex;
          justify-content: space-between;
          margin-top: 2.5rem;
          font-size: 14pt;
        }

        .neb-signature .signature-left {
          flex: 1;
        }

        .neb-signature .signature-left p {
          margin: 0.4rem 0;
        }

        .neb-signature .signature-gap {
          margin-top: 1.5rem !important;
        }

        .neb-signature .signature-right {
          text-align: center;
          margin-top: 0.5rem;
        }

        .neb-signature .dotted {
          margin-bottom: 0.25rem;
          letter-spacing: 1px;
        }

        .neb-signature .campus-chief-name {
          margin: 0;
          font-weight: bold;
        }

        .neb-signature .title-label {
          font-weight: bold;
          margin: 0;
        }

        /* Footer - NEB Notes */
        .neb-footer {
          margin-top: 2rem;
          font-size: 14pt;
        }

        .neb-footer p {
          margin: 3px 0;
        }

        .neb-footer .indent {
          padding-left: 7rem;
        }

        /* Print Styles - Comprehensive A4 Optimization */
        @media print {
          /* Hide non-printable elements */
          .no-print,
          .neb-actions {
            display: none !important;
          }

          /* Remove overlay styling */
          .neb-grade-overlay {
            position: static;
            background: none;
            padding: 0;
            overflow: visible;
          }

          .neb-container {
            display: block;
          }

          /* A4 Page Setup */
          .neb-a4 {
            width: 100%;
            min-height: auto;
            box-shadow: none;
            padding: 8mm 12mm;
            margin: 0;
            page-break-after: always;
            page-break-inside: avoid;
          }

          /* Prevent blank last page */
          .neb-a4:last-child {
            page-break-after: auto;
          }

          /* Header - Optimized for print */
          .report-header {
            border-bottom: 2px solid #000;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }

          /* Logo sizing for print - smaller for better fit */
          .school-logo {
            width: 55px;
            height: 55px;
          }

          .school-logo.right-logo {
            width: 55px;
            height: 55px;
          }

          .logo-placeholder {
            width: 55px;
            height: 55px;
            font-size: 32px;
          }

          /* Font size reductions for print */
          .school-name {
            font-size: 19pt;
          }

          .school-tagline {
            font-size: 9pt;
          }

          .school-address {
            font-size: 9pt;
            margin: 3px 0;
          }

          .school-contact {
            font-size: 8pt;
          }

          .school-website {
            font-size: 8pt;
          }

          /* Report Title - Print optimized */
          .report-title {
            margin: 8px 0;
            padding: 6px;
            border: 2px solid #000;
          }

          .report-title h2 {
            font-size: 14pt;
            letter-spacing: 1px;
          }

          .report-title h3 {
            font-size: 11pt;
            margin: 3px 0 0;
          }

          .academic-year {
            font-size: 9pt;
            margin: 3px 0 0;
          }

          /* Student Info Section - Print */
          .student-info-section {
            margin: 8px 0;
            padding: 6px 8px;
            border: 1.5px solid #000;
          }

          .info-grid {
            gap: 6px;
          }

          .info-item .label {
            font-size: 8pt;
          }

          .info-item .value {
            font-size: 10pt;
          }

          /* Table - Print optimized */
          .neb-table-section {
            margin: 8px 0;
            page-break-inside: avoid;
          }

          .neb-table {
            font-size: 10pt;
            border: 2px solid #000;
          }

          .neb-table th,
          .neb-table td {
            border: 1.5px solid #000 !important;
            padding: 4px 6px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .neb-table th {
            font-size: 9pt;
            padding: 3px 4px;
          }

          .neb-table .code-col { width: 60px; }
          .neb-table .subject-col { width: auto; min-width: 130px; }
          .neb-table .marks-col { width: 50px; }
          .neb-table .ch-col { width: 50px; }
          .neb-table .gp-col { width: 50px; }
          .neb-table .grade-col { width: 45px; }
          .neb-table .final-col { width: 50px; }
          .neb-table .remarks-col { width: 60px; }

          /* Keep Theory + Internal rows together (same subject) */
          .neb-table tbody tr.theory-row {
            page-break-inside: avoid;
            page-break-after: avoid;
          }

          .neb-table tbody tr.internal-row {
            page-break-inside: avoid;
            page-break-before: avoid;
          }

          /* GPA row should not break */
          .neb-table .gpa-row {
            page-break-inside: avoid;
            page-break-before: avoid;
          }

          .neb-table .gpa-row td {
            padding: 5px 6px;
            border-top: 2px solid #000 !important;
          }

          .neb-table .gpa-value {
            font-size: 12pt;
          }

          .neb-table .theory-row td,
          .neb-table .internal-row td {
            padding: 3px 5px;
          }

          /* Signature Section - Print with fixed spacing */
          .neb-signature {
            margin-top: 15mm;
            font-size: 11pt;
            page-break-inside: avoid;
            page-break-before: avoid;
          }

          .neb-signature .signature-left p {
            margin: 0.3rem 0;
          }

          .neb-signature .signature-gap {
            margin-top: 1rem !important;
          }

          .neb-signature .signature-right {
            margin-top: 0.3rem;
          }

          .neb-signature .dotted {
            letter-spacing: 0.5px;
          }

          /* Footer - Print optimized */
          .neb-footer {
            margin-top: 12mm;
            font-size: 10pt;
            page-break-inside: avoid;
            page-break-before: avoid;
          }

          .neb-footer p {
            margin: 2px 0;
          }

          .neb-footer .indent {
            padding-left: 5rem;
          }

          /* Page setup */
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }

          /* Ensure all text is black for print */
          * {
            color: #000 !important;
          }

          /* Force background colors and borders to print */
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default NEBGradeSheet;
