const prisma = require('../config/database');
const { asyncHandler } = require('../utils');

/**
 * TEACHER CONTEXT MIDDLEWARE
 * 
 * Provides helper methods and data for teacher-specific operations.
 * Attaches teacher's accessible classes, sections, and subjects to the request.
 */

/**
 * Load teacher's assignments and attach to request
 * This provides quick access to what the teacher can access
 */
const loadTeacherContext = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.roles.includes('TEACHER')) {
    return next();
  }

  // Load all teacher assignments for current academic year
  const assignments = await prisma.teacherSubject.findMany({
    where: {
      userId: req.user.id,
      classSubject: {
        academicYear: {
          isCurrent: true,
        },
      },
    },
    include: {
      classSubject: {
        include: {
          class: true,
          academicYear: true,
          subject: true,
        },
      },
      section: true,
    },
  });

  // Extract unique classes, sections, and subjects
  const accessibleClasses = new Map();
  const accessibleSections = new Map();
  const accessibleSubjects = new Map();
  const classSectionPairs = new Set();

  assignments.forEach((assignment) => {
    const { classSubject, section } = assignment;
    
    accessibleClasses.set(classSubject.class.id, classSubject.class);
    accessibleSections.set(section.id, section);
    accessibleSubjects.set(classSubject.subject.id, classSubject.subject);
    classSectionPairs.add(`${classSubject.classId}-${section.id}`);
  });

  req.teacherContext = {
    assignments,
    accessibleClassIds: Array.from(accessibleClasses.keys()),
    accessibleSectionIds: Array.from(accessibleSections.keys()),
    accessibleSubjectIds: Array.from(accessibleSubjects.keys()),
    accessibleClasses: Array.from(accessibleClasses.values()),
    accessibleSections: Array.from(accessibleSections.values()),
    accessibleSubjects: Array.from(accessibleSubjects.values()),
    classSectionPairs: Array.from(classSectionPairs),
    
    // Helper methods
    canAccessClass: (classId) => accessibleClasses.has(classId),
    canAccessSection: (sectionId) => accessibleSections.has(sectionId),
    canAccessSubject: (subjectId) => accessibleSubjects.has(subjectId),
    canAccessClassSection: (classId, sectionId) => 
      classSectionPairs.has(`${classId}-${sectionId}`),
    
    // Get assignment for specific class/section/subject
    getAssignment: (classId, sectionId, subjectId) => {
      return assignments.find(
        (a) =>
          a.classSubject.classId === classId &&
          a.sectionId === sectionId &&
          (subjectId ? a.classSubject.subjectId === subjectId : true)
      );
    },
    
    // Check if teacher is class teacher for any section
    isClassTeacherForAny: () => 
      assignments.some((a) => a.isClassTeacher),
    
    // Get sections where teacher is class teacher
    getClassTeacherSections: () =>
      assignments.filter((a) => a.isClassTeacher).map((a) => ({
        classId: a.classSubject.classId,
        sectionId: a.sectionId,
        className: a.classSubject.class.name,
        sectionName: a.section.name,
      })),
  };

  next();
});

/**
 * Load student context for student users
 */
const loadStudentContext = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.roles.includes('STUDENT') || !req.user.studentId) {
    return next();
  }

  // Load student's current enrollment
  const enrollment = await prisma.studentClass.findFirst({
    where: {
      studentId: req.user.studentId,
      academicYear: { isCurrent: true },
      status: 'active',
    },
    include: {
      class: true,
      section: true,
      academicYear: true,
      student: true,
    },
  });

  if (!enrollment) {
    req.studentContext = { enrolled: false };
    return next();
  }

  // Get subjects for current class
  const classSubjects = await prisma.classSubject.findMany({
    where: {
      classId: enrollment.classId,
      academicYearId: enrollment.academicYearId,
    },
    include: {
      subject: true,
    },
  });

  req.studentContext = {
    enrolled: true,
    enrollment,
    studentId: req.user.studentId,
    classId: enrollment.classId,
    sectionId: enrollment.sectionId,
    academicYearId: enrollment.academicYearId,
    className: enrollment.class.name,
    sectionName: enrollment.section.name,
    academicYear: enrollment.academicYear.name,
    rollNumber: enrollment.rollNumber,
    subjects: classSubjects.map((cs) => ({
      id: cs.subject.id,
      name: cs.subject.name,
      code: cs.subject.code,
      fullMarks: cs.fullMarks,
      passMarks: cs.passMarks,
    })),
  };

  next();
});

/**
 * Load parent context with children information
 */
const loadParentContext = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.roles.includes('PARENT') || !req.user.parentId) {
    return next();
  }

  // Load parent's children
  const studentParents = await prisma.studentParent.findMany({
    where: {
      parentId: req.user.parentId,
    },
    include: {
      student: {
        include: {
          user: true,
          studentClasses: {
            where: {
              academicYear: { isCurrent: true },
              status: 'active',
            },
            include: {
              class: true,
              section: true,
            },
          },
        },
      },
    },
  });

  const children = studentParents.map((sp) => {
    const currentEnrollment = sp.student.studentClasses[0];
    
    return {
      studentId: sp.student.id,
      userId: sp.student.userId,
      firstName: sp.student.user.firstName,
      lastName: sp.student.user.lastName,
      admissionNumber: sp.student.admissionNumber,
      relationship: sp.relationship,
      isPrimary: sp.isPrimary,
      currentClass: currentEnrollment?.class.name,
      currentSection: currentEnrollment?.section.name,
      rollNumber: currentEnrollment?.rollNumber,
    };
  });

  req.parentContext = {
    parentId: req.user.parentId,
    children,
    childrenIds: children.map((c) => c.studentId),
    
    // Helper method to check if student is a child
    isChildOf: (studentId) => children.some((c) => c.studentId === studentId),
    
    // Get specific child info
    getChild: (studentId) => children.find((c) => c.studentId === studentId),
  };

  next();
});

/**
 * Combined context loader - loads appropriate context based on user role
 */
const loadUserContext = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  // Load context in parallel based on roles
  const promises = [];

  if (req.user.roles.includes('TEACHER')) {
    promises.push(
      (async () => {
        await loadTeacherContext(req, res, () => {});
      })()
    );
  }

  if (req.user.roles.includes('STUDENT')) {
    promises.push(
      (async () => {
        await loadStudentContext(req, res, () => {});
      })()
    );
  }

  if (req.user.roles.includes('PARENT')) {
    promises.push(
      (async () => {
        await loadParentContext(req, res, () => {});
      })()
    );
  }

  await Promise.all(promises);
  next();
});

module.exports = {
  loadTeacherContext,
  loadStudentContext,
  loadParentContext,
  loadUserContext,
};
