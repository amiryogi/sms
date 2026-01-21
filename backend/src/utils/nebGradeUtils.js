/**
 * NEB (Nepal Education Board) Grade Utilities
 * For Grade 11-12 GPA calculation
 */

// NEB Grade Scale
const NEB_GRADE_SCALE = [
  { grade: 'A+', min: 90, max: 100, gpa: 4.0 },
  { grade: 'A',  min: 80, max: 89,  gpa: 3.6 },
  { grade: 'B+', min: 70, max: 79,  gpa: 3.2 },
  { grade: 'B',  min: 60, max: 69,  gpa: 2.8 },
  { grade: 'C+', min: 50, max: 59,  gpa: 2.4 },
  { grade: 'C',  min: 40, max: 49,  gpa: 2.0 },
  { grade: 'D',  min: 30, max: 39,  gpa: 1.6 },
  { grade: 'NG', min: 0,  max: 29,  gpa: 0.0 },
];

/**
 * Calculate percentage from marks
 * @param {number} marksObtained 
 * @param {number} fullMarks 
 * @returns {number} Percentage (0-100)
 */
const calculatePercentage = (marksObtained, fullMarks) => {
  if (!fullMarks || fullMarks <= 0) return 0;
  return (marksObtained / fullMarks) * 100;
};

/**
 * Get NEB grade and GPA from percentage
 * @param {number} percentage 
 * @returns {{ grade: string, gpa: number }}
 */
const getGradeFromPercentage = (percentage) => {
  for (const scale of NEB_GRADE_SCALE) {
    if (percentage >= scale.min && percentage <= scale.max) {
      return { grade: scale.grade, gpa: scale.gpa };
    }
  }
  // Default to NG if below 0 or invalid
  return { grade: 'NG', gpa: 0.0 };
};

/**
 * Check if a component is passed
 * @param {number} marksObtained 
 * @param {number} passMarks 
 * @returns {boolean}
 */
const isComponentPassed = (marksObtained, passMarks) => {
  return marksObtained >= passMarks;
};

/**
 * Check if a subject is passed (both theory and practical must pass)
 * IMPORTANT: Practical failure = subject failure
 * @param {Object} theoryResult - { marksObtained, passMarks }
 * @param {Object|null} practicalResult - { marksObtained, passMarks } or null
 * @returns {boolean}
 */
const isSubjectPassed = (theoryResult, practicalResult = null) => {
  // Theory must always pass
  if (!isComponentPassed(theoryResult.marksObtained, theoryResult.passMarks)) {
    return false;
  }
  
  // If practical exists, it must also pass
  if (practicalResult) {
    if (!isComponentPassed(practicalResult.marksObtained, practicalResult.passMarks)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Calculate credit-weighted GPA for NEB
 * Formula: GPA = Σ(gradePoint × creditHours) / Σ(creditHours)
 * @param {Array} componentResults - Array of { percentage, creditHours }
 * @returns {number} GPA rounded to 2 decimal places
 */
const calculateNEBGPA = (componentResults) => {
  if (!componentResults || componentResults.length === 0) {
    return 0;
  }

  let totalWeightedGPA = 0;
  let totalCreditHours = 0;

  for (const result of componentResults) {
    const { gpa } = getGradeFromPercentage(result.percentage);
    totalWeightedGPA += gpa * result.creditHours;
    totalCreditHours += result.creditHours;
  }

  if (totalCreditHours === 0) {
    return 0;
  }

  // Round to 2 decimal places
  return Math.round((totalWeightedGPA / totalCreditHours) * 100) / 100;
};

/**
 * Process marks for a student's subject components and calculate grades
 * @param {Array} componentMarks - Array of component mark entries
 * @returns {Object} { componentGrades: Array, subjectGPA: number, passed: boolean }
 */
const processComponentMarks = (componentMarks) => {
  const componentGrades = componentMarks.map(cm => {
    const percentage = calculatePercentage(cm.marksObtained, cm.fullMarks);
    const { grade, gpa } = getGradeFromPercentage(percentage);
    const passed = isComponentPassed(cm.marksObtained, cm.passMarks);
    
    return {
      componentId: cm.componentId,
      type: cm.type,
      marksObtained: cm.marksObtained,
      fullMarks: cm.fullMarks,
      passMarks: cm.passMarks,
      creditHours: cm.creditHours,
      percentage,
      grade,
      gpa,
      passed,
    };
  });

  // Check if subject is passed (all components must pass)
  const theoryResults = componentGrades.filter(c => c.type === 'THEORY');
  const practicalResults = componentGrades.filter(c => c.type === 'PRACTICAL');
  
  let subjectPassed = true;
  
  // All theory components must pass
  for (const theory of theoryResults) {
    if (!theory.passed) {
      subjectPassed = false;
      break;
    }
  }
  
  // All practical components must pass (practical failure = subject failure)
  if (subjectPassed) {
    for (const practical of practicalResults) {
      if (!practical.passed) {
        subjectPassed = false;
        break;
      }
    }
  }

  // Calculate GPA for this subject
  const gpaResults = componentGrades.map(c => ({
    percentage: c.percentage,
    creditHours: c.creditHours,
  }));
  const subjectGPA = calculateNEBGPA(gpaResults);

  return {
    componentGrades,
    subjectGPA,
    passed: subjectPassed,
  };
};

/**
 * Check if a class is NEB-eligible (Grade 11 or 12)
 * @param {number} gradeLevel 
 * @returns {boolean}
 */
const isNEBClass = (gradeLevel) => {
  return gradeLevel >= 11;
};

/**
 * Get the overall NEB grade from GPA
 * @param {number} gpa 
 * @returns {string}
 */
const getGradeFromGPA = (gpa) => {
  if (gpa >= 3.6) return 'A+';
  if (gpa >= 3.2) return 'A';
  if (gpa >= 2.8) return 'B+';
  if (gpa >= 2.4) return 'B';
  if (gpa >= 2.0) return 'C+';
  if (gpa >= 1.6) return 'C';
  if (gpa >= 1.2) return 'D';
  return 'NG';
};

module.exports = {
  NEB_GRADE_SCALE,
  calculatePercentage,
  getGradeFromPercentage,
  isComponentPassed,
  isSubjectPassed,
  calculateNEBGPA,
  processComponentMarks,
  isNEBClass,
  getGradeFromGPA,
};
