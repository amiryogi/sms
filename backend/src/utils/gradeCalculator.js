/**
 * Nepal-style GPA and Grade Calculation Utility
 * Based on NEB (National Examination Board) Nepal grading system
 *
 * Grade Mapping:
 * 90-100% = A+ (4.0 GPA)
 * 80-89%  = A  (3.6 GPA)
 * 70-79%  = B+ (3.2 GPA)
 * 60-69%  = B  (2.8 GPA)
 * 50-59%  = C+ (2.4 GPA)
 * 40-49%  = C  (2.0 GPA)
 * 35-39%  = D  (1.6 GPA)
 * < 35%   = NG (0.0 GPA) - Not Graded / Fail
 */

// Grade thresholds based on Nepal NEB system
const GRADE_THRESHOLDS = [
  { min: 90, max: 100, grade: "A+", gpa: 4.0, description: "Outstanding" },
  { min: 80, max: 89.99, grade: "A", gpa: 3.6, description: "Excellent" },
  { min: 70, max: 79.99, grade: "B+", gpa: 3.2, description: "Very Good" },
  { min: 60, max: 69.99, grade: "B", gpa: 2.8, description: "Good" },
  { min: 50, max: 59.99, grade: "C+", gpa: 2.4, description: "Satisfactory" },
  { min: 40, max: 49.99, grade: "C", gpa: 2.0, description: "Acceptable" },
  {
    min: 35,
    max: 39.99,
    grade: "D",
    gpa: 1.6,
    description: "Partially Acceptable",
  },
  { min: 0, max: 34.99, grade: "NG", gpa: 0.0, description: "Not Graded" },
];

/**
 * Calculate grade and GPA from percentage
 * @param {number} percentage - The percentage score (0-100)
 * @returns {Object} { grade, gpa, description, isPassed }
 */
const calculateGradeFromPercentage = (percentage) => {
  // Handle null/undefined/NaN
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return {
      grade: "NG",
      gpa: 0.0,
      description: "Not Graded",
      isPassed: false,
    };
  }

  // Clamp percentage to valid range
  const pct = Math.max(0, Math.min(100, parseFloat(percentage)));

  for (const threshold of GRADE_THRESHOLDS) {
    if (pct >= threshold.min && pct <= threshold.max) {
      return {
        grade: threshold.grade,
        gpa: threshold.gpa,
        description: threshold.description,
        isPassed: threshold.grade !== "NG",
      };
    }
  }

  return { grade: "NG", gpa: 0.0, description: "Not Graded", isPassed: false };
};

/**
 * Calculate grade from marks obtained and full marks
 * @param {number} marksObtained - Marks obtained by student
 * @param {number} fullMarks - Total/full marks
 * @returns {Object} { grade, gpa, description, isPassed, percentage }
 */
const calculateGradeFromMarks = (marksObtained, fullMarks) => {
  if (!fullMarks || fullMarks <= 0) {
    return {
      grade: "NG",
      gpa: 0.0,
      description: "Invalid",
      isPassed: false,
      percentage: 0,
    };
  }

  const percentage = (parseFloat(marksObtained) / parseFloat(fullMarks)) * 100;
  const result = calculateGradeFromPercentage(percentage);

  return {
    ...result,
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
  };
};

/**
 * Calculate subject-wise grade (combining theory and practical)
 * Nepal Rule: If either theory or practical is absent/failed (< 35%), subject is NG
 *
 * @param {Object} params
 * @param {number} params.theoryMarks - Theory marks obtained
 * @param {number} params.theoryFullMarks - Theory full marks
 * @param {number} params.practicalMarks - Practical marks obtained (0 if no practical)
 * @param {number} params.practicalFullMarks - Practical full marks (0 if no practical)
 * @param {boolean} params.hasPractical - Whether subject has practical component
 * @param {boolean} params.isAbsent - Whether student was absent
 * @returns {Object} Complete subject grade breakdown
 */
const calculateSubjectGrade = ({
  theoryMarks,
  theoryFullMarks,
  practicalMarks = 0,
  practicalFullMarks = 0,
  hasPractical = false,
  isAbsent = false,
}) => {
  // If student is absent, return NG
  if (isAbsent) {
    return {
      theoryMarks: 0,
      theoryFullMarks,
      theoryPercentage: 0,
      theoryGrade: "AB",
      theoryGpa: 0,
      practicalMarks: hasPractical ? 0 : null,
      practicalFullMarks: hasPractical ? practicalFullMarks : null,
      practicalPercentage: hasPractical ? 0 : null,
      practicalGrade: hasPractical ? "AB" : null,
      practicalGpa: hasPractical ? 0 : null,
      totalMarks: 0,
      totalFullMarks: theoryFullMarks + (hasPractical ? practicalFullMarks : 0),
      finalPercentage: 0,
      finalGrade: "AB",
      finalGpa: 0,
      isPassed: false,
      isAbsent: true,
      remark: "Absent",
    };
  }

  // Parse values
  const theory = parseFloat(theoryMarks) || 0;
  const theoryFull = parseFloat(theoryFullMarks) || 100;
  const practical = hasPractical ? parseFloat(practicalMarks) || 0 : 0;
  const practicalFull = hasPractical ? parseFloat(practicalFullMarks) || 0 : 0;

  // Calculate theory percentage and grade
  const theoryPercentage = theoryFull > 0 ? (theory / theoryFull) * 100 : 0;
  const theoryResult = calculateGradeFromPercentage(theoryPercentage);

  // Calculate practical percentage and grade (if applicable)
  let practicalResult = null;
  let practicalPercentage = null;
  if (hasPractical && practicalFull > 0) {
    practicalPercentage = (practical / practicalFull) * 100;
    practicalResult = calculateGradeFromPercentage(practicalPercentage);
  }

  // Calculate combined/final marks and percentage
  const totalMarks = theory + practical;
  const totalFullMarks = theoryFull + practicalFull;
  const finalPercentage =
    totalFullMarks > 0 ? (totalMarks / totalFullMarks) * 100 : 0;
  const finalResult = calculateGradeFromPercentage(finalPercentage);

  // Nepal Rule: Check if either component fails (< 35%)
  let isPassed = finalResult.isPassed;
  let remark = finalResult.description;

  // If theory fails (< 35%), entire subject fails
  if (theoryPercentage < 35) {
    isPassed = false;
    remark = "Theory Failed";
  }

  // If practical exists and fails (< 35%), entire subject fails
  if (hasPractical && practicalFull > 0 && practicalPercentage < 35) {
    isPassed = false;
    remark = "Practical Failed";
  }

  // Override grade to NG if failed
  const overallGrade = isPassed ? finalResult.grade : "NG";
  const overallGpa = isPassed ? finalResult.gpa : 0.0;

  return {
    theoryMarks: Math.round(theory * 100) / 100,
    theoryFullMarks: theoryFull,
    theoryPercentage: Math.round(theoryPercentage * 100) / 100,
    theoryGrade: theoryResult.grade,
    theoryGpa: theoryResult.gpa,
    practicalMarks: hasPractical ? Math.round(practical * 100) / 100 : null,
    practicalFullMarks: hasPractical ? practicalFull : null,
    practicalPercentage: hasPractical
      ? Math.round(practicalPercentage * 100) / 100
      : null,
    practicalGrade: hasPractical ? practicalResult?.grade : null,
    practicalGpa: hasPractical ? practicalResult?.gpa : null,
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
 * Nepal Rule: If any subject has NG (0.0), overall result is FAIL
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
 * @returns {Object} { gpa, grade, isPassed, totalSubjects, passedSubjects, failedSubjects, totalCredits }
 */
const calculateOverallGPA = (subjects, options = {}) => {
  const { useCreditWeighting = false } = options;

  if (!subjects || subjects.length === 0) {
    return {
      gpa: 0,
      grade: "NG",
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
  let hasNG = false;

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
      hasNG = true;
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
  const gradeResult = calculateGradeFromPercentage(averagePercentage);

  // Nepal Rule: Any NG means overall FAIL
  const isPassed = !hasNG && roundedGpa > 0;
  const overallGrade = isPassed ? gradeResult.grade : "NG";

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
  if (gpa === null || gpa === undefined) return "0.00";
  return parseFloat(gpa).toFixed(2);
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
  GRADE_THRESHOLDS,
  calculateGradeFromPercentage,
  calculateGradeFromMarks,
  calculateSubjectGrade,
  calculateOverallGPA,
  getGradeColor,
  formatGPA,
  getResultStatus,
};
