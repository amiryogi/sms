/**
 * Nepal-style GPA and Grade Calculation Utility
 *
 * Every function takes an optional grade `scale` (see `utils/gradeScale.js`).
 * Without one it uses the official NEB 8-band scale:
 *
 * 90-100% = A+ (4.0 GPA)
 * 80-89%  = A  (3.6 GPA)
 * 70-79%  = B+ (3.2 GPA)
 * 60-69%  = B  (2.8 GPA)
 * 50-59%  = C+ (2.4 GPA)
 * 40-49%  = C  (2.0 GPA)
 * 35-39%  = D  (1.6 GPA)
 * < 35%   = NG (0.0 GPA) - Not Graded / Fail
 *
 * A school's own scale is loaded by `services/gradeScale.service.js` and passed
 * in. Nothing here should hardcode a grade letter or a pass percentage.
 */

const { NEB_8_BAND, normalizeScale } = require("./gradeScale");

/** The scale used when a caller passes none: the official NEB 8-band scale. */
const DEFAULT_SCALE = normalizeScale(NEB_8_BAND);

// The NEB bands in their original shape, kept for existing importers.
const GRADE_THRESHOLDS = DEFAULT_SCALE.bands.map(
  ({ min, max, grade, gpa, description }) => ({ min, max, grade, gpa, description }),
);

/** A finite number, or `fallback` for null, undefined, "" and non-numeric input. */
const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

const round2 = (n) => Math.round(n * 100) / 100;

/** The result a scale gives for a failure or an ungradeable input. */
const failResult = (scale, description) => {
  const band = scale.bands.find((b) => b.grade === scale.failGrade);
  return {
    grade: scale.failGrade,
    gpa: 0.0,
    description: description ?? band?.description ?? "Not Graded",
    isPassed: false,
  };
};

/**
 * Calculate grade and GPA from percentage
 * @param {number} percentage - The percentage score (0-100)
 * @param {Object} [scale] - A normalized grade scale; defaults to NEB 8-band
 * @returns {Object} { grade, gpa, description, isPassed }
 */
const calculateGradeFromPercentage = (percentage, scale = DEFAULT_SCALE) => {
  // Handle null/undefined/NaN
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return failResult(scale, "Not Graded");
  }

  // Clamp percentage to valid range
  const pct = Math.max(0, Math.min(100, parseFloat(percentage)));

  // Bands are sorted highest first, so a boundary score lands in the higher band.
  for (const band of scale.bands) {
    if (pct >= band.min && pct <= band.max) {
      return {
        grade: band.grade,
        gpa: band.gpa,
        description: band.description,
        isPassed: band.isPassing,
      };
    }
  }

  return failResult(scale, "Not Graded");
};

/**
 * Calculate grade from marks obtained and full marks
 * @param {number} marksObtained - Marks obtained by student
 * @param {number} fullMarks - Total/full marks
 * @param {Object} [scale] - A normalized grade scale; defaults to NEB 8-band
 * @returns {Object} { grade, gpa, description, isPassed, percentage }
 */
const calculateGradeFromMarks = (
  marksObtained,
  fullMarks,
  scale = DEFAULT_SCALE,
) => {
  const full = toNumber(fullMarks, 0);
  if (full <= 0) {
    return { ...failResult(scale, "Invalid"), percentage: 0 };
  }

  // Non-numeric marks are ungradeable: fail grade, 0%, never NaN.
  const marks = toNumber(marksObtained, NaN);
  if (Number.isNaN(marks)) {
    return { ...failResult(scale, "Not Graded"), percentage: 0 };
  }

  // The reported percentage is the one the grade was computed from (0..100).
  // Marks entry rejects values above full marks; this keeps a stray value
  // from printing as "150%".
  const percentage = Math.max(0, Math.min(100, (marks / full) * 100));
  const result = calculateGradeFromPercentage(percentage, scale);

  return {
    ...result,
    percentage: round2(percentage),
  };
};

/**
 * Calculate subject-wise grade (combining theory and practical)
 * Nepal Rule: if theory or practical falls below the scale's pass percentage
 * (35% on the NEB scale), the whole subject fails and prints the fail grade.
 *
 * @param {Object} params
 * @param {number} params.theoryMarks - Theory marks obtained
 * @param {number} params.theoryFullMarks - Theory full marks
 * @param {number} params.practicalMarks - Practical marks obtained (0 if no practical)
 * @param {number} params.practicalFullMarks - Practical full marks (0 if no practical)
 * @param {boolean} params.hasPractical - Whether subject has practical component
 * @param {boolean} params.isAbsent - Whether student was absent
 * @param {Object} [scale] - A normalized grade scale; defaults to NEB 8-band
 * @returns {Object} Complete subject grade breakdown
 */
const calculateSubjectGrade = (
  {
    theoryMarks,
    theoryFullMarks,
    practicalMarks = 0,
    practicalFullMarks = 0,
    hasPractical = false,
    isAbsent = false,
  },
  scale = DEFAULT_SCALE,
) => {
  // Absent students print AB, whatever the scale
  if (isAbsent) {
    const absentTheoryFull = toNumber(theoryFullMarks, 0);
    const absentPracticalFull = hasPractical ? toNumber(practicalFullMarks, 0) : 0;
    return {
      theoryMarks: 0,
      theoryFullMarks: absentTheoryFull,
      theoryPercentage: 0,
      theoryGrade: "AB",
      theoryGpa: 0,
      practicalMarks: hasPractical ? 0 : null,
      practicalFullMarks: hasPractical ? absentPracticalFull : null,
      practicalPercentage: hasPractical ? 0 : null,
      practicalGrade: hasPractical ? "AB" : null,
      practicalGpa: hasPractical ? 0 : null,
      totalMarks: 0,
      totalFullMarks: absentTheoryFull + absentPracticalFull,
      finalPercentage: 0,
      finalGrade: "AB",
      finalGpa: 0,
      isPassed: false,
      isAbsent: true,
      remark: "Absent",
    };
  }

  // Parse values. Full marks default to 100 only when the caller gives none;
  // an explicit 0 (or junk) stays 0 and the subject fails as "Invalid full
  // marks" instead of being graded out of an invented 100.
  const theory = toNumber(theoryMarks, 0);
  const theoryFull =
    theoryFullMarks === undefined || theoryFullMarks === null
      ? 100
      : toNumber(theoryFullMarks, 0);
  const practical = hasPractical ? toNumber(practicalMarks, 0) : 0;
  const practicalFull = hasPractical ? toNumber(practicalFullMarks, 0) : 0;
  // A practical component only exists when it has marks to score out of.
  const practicalGraded = hasPractical && practicalFull > 0;

  // Calculate theory percentage and grade
  const theoryPercentage = theoryFull > 0 ? (theory / theoryFull) * 100 : 0;
  const theoryResult = calculateGradeFromPercentage(theoryPercentage, scale);

  // Calculate practical percentage and grade (if applicable)
  let practicalResult = null;
  let practicalPercentage = null;
  if (practicalGraded) {
    practicalPercentage = (practical / practicalFull) * 100;
    practicalResult = calculateGradeFromPercentage(practicalPercentage, scale);
  }

  // Calculate combined/final marks and percentage
  const totalMarks = theory + practical;
  const totalFullMarks = theoryFull + practicalFull;
  const finalPercentage =
    totalFullMarks > 0 ? (totalMarks / totalFullMarks) * 100 : 0;
  const finalResult = calculateGradeFromPercentage(finalPercentage, scale);

  // Nepal Rule: a component below the pass percentage fails the subject
  let isPassed = finalResult.isPassed;
  let remark = finalResult.description;
  const { passPercent } = scale;

  // If theory fails, entire subject fails
  if (theoryPercentage < passPercent) {
    isPassed = false;
    remark = "Theory Failed";
  }
  if (theoryFull <= 0) {
    isPassed = false;
    remark = "Invalid full marks";
  }

  // If practical exists and fails, entire subject fails
  if (practicalGraded && practicalPercentage < passPercent) {
    isPassed = false;
    remark = "Practical Failed";
  }

  // A failed subject prints the scale's fail grade (NG on the NEB scale)
  const overallGrade = isPassed ? finalResult.grade : scale.failGrade;
  const overallGpa = isPassed ? finalResult.gpa : 0.0;

  return {
    theoryMarks: Math.round(theory * 100) / 100,
    theoryFullMarks: theoryFull,
    theoryPercentage: Math.round(theoryPercentage * 100) / 100,
    theoryGrade: theoryResult.grade,
    theoryGpa: theoryResult.gpa,
    practicalMarks: hasPractical ? Math.round(practical * 100) / 100 : null,
    practicalFullMarks: hasPractical ? practicalFull : null,
    // null (not undefined or 0) whenever no practical was graded
    practicalPercentage: practicalGraded ? round2(practicalPercentage) : null,
    practicalGrade: practicalGraded ? practicalResult.grade : null,
    practicalGpa: practicalGraded ? practicalResult.gpa : null,
    totalMarks: Math.round(totalMarks * 100) / 100,
    totalFullMarks,
    finalPercentage: Math.round(finalPercentage * 100) / 100,
    finalGrade: overallGrade,
    finalGpa: overallGpa,
    isPassed,
    isAbsent: false,
    remark,
  };
};

/**
 * Calculate overall GPA from array of subject GPAs
 * Nepal Rule: if any subject fails, the overall result fails
 *
 * For NEB Grade 11-12 (useCreditWeighting=true):
 *   GPA = Σ(gradePoint × creditHours) / Σ(creditHours)
 *
 * For Grade 1-10 (useCreditWeighting=false):
 *   GPA = Simple average of all subject GPAs
 *
 * @param {Array<Object>} subjects - Array of subject results with gpa and creditHours properties
 * @param {Object} options - Calculation options
 * @param {boolean} options.useCreditWeighting - Whether to use credit-weighted calculation (NEB mode)
 * @param {Object} [options.scale] - A normalized grade scale; defaults to NEB 8-band
 * @returns {Object} { gpa, grade, isPassed, totalSubjects, passedSubjects, failedSubjects, totalCredits }
 */
const calculateOverallGPA = (subjects, options = {}) => {
  const { useCreditWeighting = false, scale = DEFAULT_SCALE } = options;

  if (!subjects || subjects.length === 0) {
    return {
      gpa: 0,
      grade: scale.failGrade,
      isPassed: false,
      totalSubjects: 0,
      passedSubjects: 0,
      failedSubjects: 0,
      averagePercentage: 0,
      totalCredits: 0,
    };
  }

  let totalGpa = 0;
  let totalPercentage = 0;
  let totalCredits = 0;
  let weightedGpaSum = 0;
  let passedSubjects = 0;
  let failedSubjects = 0;
  let anyFailed = false;

  subjects.forEach((subject) => {
    const gpa = parseFloat(subject.finalGpa) || 0;
    const percentage = parseFloat(subject.finalPercentage) || 0;
    const creditHours = parseFloat(subject.creditHours) || 3; // Default 3 credit hours

    totalGpa += gpa;
    totalPercentage += percentage;

    // For credit-weighted calculation (NEB)
    weightedGpaSum += gpa * creditHours;
    totalCredits += creditHours;

    if (subject.isPassed) {
      passedSubjects++;
    } else {
      failedSubjects++;
      anyFailed = true;
    }
  });

  // Calculate GPA based on mode
  let calculatedGpa;
  if (useCreditWeighting && totalCredits > 0) {
    // NEB Mode: Credit-weighted GPA = Σ(GPA × Credits) / Σ(Credits)
    calculatedGpa = weightedGpaSum / totalCredits;
  } else {
    // Standard Mode: Simple average
    calculatedGpa = subjects.length > 0 ? totalGpa / subjects.length : 0;
  }

  const averagePercentage =
    subjects.length > 0 ? totalPercentage / subjects.length : 0;

  // Round GPA to 2 decimal places
  const roundedGpa = Math.round(calculatedGpa * 100) / 100;

  // Get grade from average percentage for display
  const gradeResult = calculateGradeFromPercentage(averagePercentage, scale);

  // Nepal Rule: any failed subject means overall FAIL
  const isPassed = !anyFailed && roundedGpa > 0;
  const overallGrade = isPassed ? gradeResult.grade : scale.failGrade;

  return {
    gpa: roundedGpa,
    grade: overallGrade,
    isPassed,
    totalSubjects: subjects.length,
    passedSubjects,
    failedSubjects,
    averagePercentage: Math.round(averagePercentage * 100) / 100,
    totalCredits: Math.round(totalCredits * 10) / 10, // Round to 1 decimal
  };
};

/**
 * Get grade color for UI display
 * @param {string} grade
 * @returns {Object} { bg, text } - Background and text colors
 */
const getGradeColor = (grade) => {
  const colors = {
    "A+": { bg: "#dcfce7", text: "#166534" }, // Green
    A: { bg: "#d1fae5", text: "#065f46" },
    "B+": { bg: "#dbeafe", text: "#1e40af" }, // Blue
    B: { bg: "#e0e7ff", text: "#3730a3" },
    "C+": { bg: "#fef3c7", text: "#92400e" }, // Yellow/Orange
    C: { bg: "#fef9c3", text: "#854d0e" },
    D: { bg: "#fed7aa", text: "#9a3412" }, // Orange
    NG: { bg: "#fee2e2", text: "#991b1b" }, // Red
    AB: { bg: "#f3f4f6", text: "#6b7280" }, // Gray for Absent
  };

  return colors[grade] || colors["NG"];
};

/**
 * Format GPA for display (2 decimal places)
 * @param {number} gpa
 * @returns {string}
 */
const formatGPA = (gpa) => {
  return toNumber(gpa, 0).toFixed(2);
};

/**
 * Get result status text
 * @param {boolean} isPassed
 * @returns {string}
 */
const getResultStatus = (isPassed) => {
  return isPassed ? "PASSED" : "FAILED";
};

module.exports = {
  DEFAULT_SCALE,
  GRADE_THRESHOLDS,
  calculateGradeFromPercentage,
  calculateGradeFromMarks,
  calculateSubjectGrade,
  calculateOverallGPA,
  getGradeColor,
  formatGPA,
  getResultStatus,
};
