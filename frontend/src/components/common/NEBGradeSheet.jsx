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

// NEB Subject codes mapping (official NEB codes)
const NEB_SUBJECT_CODES = {
    "Compulsory Nepali": { theory: "0011", internal: "0012" },
    "Comp. Nepali": { theory: "0011", internal: "0012" },
    "Nepali": { theory: "0011", internal: "0012" },
    "Compulsory English": { theory: "0031", internal: "0032" },
    "Comp. English": { theory: "0031", internal: "0032" },
    "English": { theory: "0031", internal: "0032" },
    "Compulsory Mathematics": { theory: "0071", internal: "0072" },
    "Comp. Mathematics": { theory: "0071", internal: "0072" },
    "Mathematics": { theory: "0071", internal: "0072" },
    "Physics": { theory: "1011", internal: "1012" },
    "Chemistry": { theory: "3011", internal: "3012" },
    "Biology": { theory: "2011", internal: "2012" },
    "Computer Science": { theory: "4011", internal: "4012" },
    "Accountancy": { theory: "5011", internal: "5012" },
    "Economics": { theory: "5021", internal: "5022" },
    "Business Studies": { theory: "5031", internal: "5032" },
    "Social Studies": { theory: "0051", internal: "0052" },
};

// NEB Credit Hours based on subject type
const getCreditHours = (subjectName, isCompulsory) => {
    // Compulsory subjects: Theory 2.25-3.75, Internal 0.75-1.25
    // Elective subjects: Theory 3.75, Internal 1.25
    const normalizedName = subjectName?.toLowerCase() || "";
    
    if (normalizedName.includes("nepali") || normalizedName.includes("comp. nepali")) {
        return { theory: 2.25, internal: 0.75 };
    }
    if (normalizedName.includes("english") || normalizedName.includes("comp. english")) {
        return { theory: 3.00, internal: 1.00 };
    }
    if (normalizedName.includes("mathematics") || normalizedName.includes("comp. math")) {
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
            const codes = getSubjectCodes(subj.subjectName, subj.subjectCode);
            const credits = getCreditHours(subj.subjectName);
            
            // Use actual credit hours if provided, otherwise use calculated
            const theoryCH = subj.theoryCreditHours || subj.creditHours * 0.75 || credits.theory;
            const internalCH = subj.internalCreditHours || subj.creditHours * 0.25 || credits.internal;
            
            groupedSubjects.push({
                subjectName: subj.subjectName,
                theoryCode: subj.theoryCode || codes.theory,
                internalCode: subj.internalCode || codes.internal,
                theoryCreditHours: parseFloat(theoryCH) || credits.theory,
                internalCreditHours: parseFloat(internalCH) || credits.internal,
                theoryGradePoint: parseFloat(subj.theoryGpa) || 0,
                internalGradePoint: parseFloat(subj.practicalGpa) || 0,
                theoryGrade: subj.theoryGrade || "NG",
                internalGrade: subj.practicalGrade || subj.internalGrade || "NG",
                finalGrade: subj.finalGrade || "NG",
                hasPractical: subj.hasPractical !== false,
                isAbsent: subj.isAbsent,
            });
        });
    }

    // Calculate total credit hours
    const totalCreditHours = groupedSubjects.reduce(
        (sum, subj) => sum + subj.theoryCreditHours + subj.internalCreditHours,
        0
    );

    // Format grade level display
    const getGradeDisplay = (level) => {
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
                    {/* Header */}
                    <header className="neb-header">
                        <div className="neb-logo">
                            {school?.logoUrl ? (
                                <img src={school.logoUrl} alt="Logo" />
                            ) : (
                                <div className="logo-placeholder">🏫</div>
                            )}
                        </div>
                        <div className="neb-school-info">
                            <h1>{school?.name || "School Name"}</h1>
                            <p className="location">{school?.address || "Location"}</p>
                            <h2 className="title">GRADE-SHEET</h2>
                        </div>
                    </header>

                    {/* Student Info - NEB Format */}
                    <section className="neb-student-info">
                        <div className="info-row">
                            <span className="label">THE GRADE(S) SECURED BY:</span>
                            <span className="value bold">{student?.name?.toUpperCase() || "STUDENT NAME"}</span>
                        </div>
                        <div className="info-row">
                            <span className="label">DATE OF BIRTH:</span>
                            <span className="value bold">
                                {student?.dobBS || "____/__/____"} B.S. &nbsp;&nbsp;( {student?.dobAD || student?.dateOfBirth?.split("T")[0] || "____/__/____"} A.D. )
                            </span>
                        </div>
                        <div className="info-row three-col">
                            <div>
                                <span className="label">REGISTRATION NO.</span>
                                <span className="value bold">{student?.registrationNumber || student?.admissionNumber || "____________"}</span>
                            </div>
                            <div>
                                <span className="label">SYMBOL NO.</span>
                                <span className="value bold">{student?.symbolNumber || student?.rollNumber || "________"}</span>
                            </div>
                            <div>
                                <span className="value bold">GRADE {getGradeDisplay(student?.gradeLevel || student?.class)}</span>
                            </div>
                        </div>
                        <div className="info-row">
                            <span className="label">IN THE FINAL EXAMINATION CONDUCTED IN</span>
                            <span className="value bold">{examination?.yearBS || "2082"} B.S. ({examination?.yearAD || examination?.academicYear || "2025"} A.D.)</span>
                        </div>
                        <div className="info-row">
                            <span>ARE GIVEN BELOW.</span>
                        </div>
                    </section>

                    {/* Marks Table - Exact NEB Format */}
                    <section className="neb-table-section">
                        <table className="neb-table">
                            <thead>
                                <tr>
                                    <th className="code-col">SUBJECT<br />CODE</th>
                                    <th className="subject-col">SUBJECTS</th>
                                    <th className="ch-col">CREDIT<br />HOURS<br />(CH)</th>
                                    <th className="gp-col">GRADE<br />POINT<br />(GP)</th>
                                    <th className="grade-col">GRADE</th>
                                    <th className="final-col">FINAL<br />GRADE<br />(FG)</th>
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
                                            <td className="center bold">{subj.theoryCreditHours.toFixed(2)}</td>
                                            <td className="center bold">{subj.isAbsent ? "AB" : subj.theoryGradePoint.toFixed(1)}</td>
                                            <td className="center bold">{subj.isAbsent ? "AB" : subj.theoryGrade}</td>
                                            <td className="center bold final-grade" rowSpan="2">
                                                {subj.finalGrade}
                                            </td>
                                            <td rowSpan="2"></td>
                                        </tr>
                                        {/* Internal/Practical Row */}
                                        <tr className="internal-row">
                                            <td className="center bold">{subj.internalCode}</td>
                                            <td className="bold">{subj.subjectName} (In)</td>
                                            <td className="center bold">{subj.internalCreditHours.toFixed(2)}</td>
                                            <td className="center bold">{subj.isAbsent ? "AB" : subj.internalGradePoint.toFixed(1)}</td>
                                            <td className="center bold">{subj.isAbsent ? "AB" : subj.internalGrade}</td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="gpa-row">
                                    <td colSpan="5" className="right bold">Grade Point Average (GPA)</td>
                                    <td className="center bold gpa-value">{summary?.gpa?.toFixed(2) || "0.00"}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </section>

                    {/* Signature Section - NEB Format */}
                    <section className="neb-signature">
                        <div className="signature-left">
                            <p>PREPARED BY:-..................................................</p>
                            <p className="signature-gap">CHECKED BY:-..................................................</p>
                            <p className="signature-gap">
                                DATE OF ISSUE:- <span className="bold">{examination?.issueDateBS || "____-__-__"} B.S.</span>
                            </p>
                        </div>
                        <div className="signature-right">
                            <p className="dotted">........................................</p>
                            <p className="bold campus-chief-name">{school?.principalName || "CAMPUS CHIEF NAME"}</p>
                            <p className="title-label">CAMPUS CHIEF</p>
                        </div>
                    </section>

                    {/* Footer Notes - NEB Format */}
                    <footer className="neb-footer">
                        <p><strong>Note :</strong> 1 Credit Hour is equal to 32 working hours.</p>
                        <p>IN (Internal) : Project work, Practical, Presentation, Community Work, Presentation,</p>
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

        /* Header - Centered */
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
          font-size: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
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

        .neb-table .code-col { width: 80px; }
        .neb-table .subject-col { width: 200px; text-align: left; }
        .neb-table .ch-col { width: 70px; }
        .neb-table .gp-col { width: 70px; }
        .neb-table .grade-col { width: 60px; }
        .neb-table .final-col { width: 70px; }
        .neb-table .remarks-col { width: 80px; }

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

        /* Print Styles */
        @media print {
          .no-print { display: none !important; }
          .neb-grade-overlay {
            position: static;
            background: none;
            padding: 0;
          }
          .neb-a4 {
            box-shadow: none;
            padding: 10mm 15mm;
            width: 100%;
            min-height: auto;
          }
          .neb-table th,
          .neb-table td {
            border: 1px solid #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
        </div>
    );
};

export default NEBGradeSheet;
