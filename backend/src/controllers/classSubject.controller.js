const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');

/**
 * @desc    Get subjects for a class in an academic year
 * @route   GET /api/v1/class-subjects
 * @access  Private
 */
const getClassSubjects = asyncHandler(async (req, res) => {
  const { classId, academicYearId } = req.query;

  if (!academicYearId) {
    throw ApiError.badRequest('Academic Year ID is required');
  }

  const where = {
    academicYearId: parseInt(academicYearId),
  };

  if (classId) {
    where.classId = parseInt(classId);
  }

  const classSubjects = await prisma.classSubject.findMany({
    where,
    include: {
      subject: true,
      teacherSubjects: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          section: true
        }
      }
    },
  });

  ApiResponse.success(res, classSubjects);
});

/**
 * @desc    Assign subject to a class for an academic year
 * @route   POST /api/v1/class-subjects
 * @access  Private/Admin
 */
const assignSubjectToClass = asyncHandler(async (req, res) => {
  const { classId, academicYearId, subjectId, fullMarks, passMarks, creditHours, theoryMarks, practicalMarks } = req.body;

  // Check if already assigned
  const existing = await prisma.classSubject.findUnique({
    where: {
      classId_academicYearId_subjectId: {
        classId: parseInt(classId),
        academicYearId: parseInt(academicYearId),
        subjectId: parseInt(subjectId),
      },
    },
  });

  if (existing) {
    throw ApiError.conflict('This subject is already assigned to this class for the year');
  }

  const classSubject = await prisma.classSubject.create({
    data: {
      classId: parseInt(classId),
      academicYearId: parseInt(academicYearId),
      subjectId: parseInt(subjectId),
      fullMarks: (theoryMarks || 100) + (practicalMarks || 0),
      passMarks: passMarks || 40,
      theoryMarks: theoryMarks || 100,
      practicalMarks: practicalMarks || 0,
      creditHours: creditHours || 3.0,
    },
    include: {
      subject: true
    }
  });

  ApiResponse.created(res, classSubject, 'Subject assigned to class successfully');
});

/**
 * @desc    Update class subject details
 * @route   PUT /api/v1/class-subjects/:id
 * @access  Private/Admin
 */
const updateClassSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fullMarks, passMarks, creditHours, theoryMarks, practicalMarks } = req.body;

  const classSubject = await prisma.classSubject.findUnique({
    where: { id: parseInt(id) },
  });

  if (!classSubject) {
    throw ApiError.notFound('Class subject assignment not found');
  }

  const updated = await prisma.classSubject.update({
    where: { id: parseInt(id) },
    data: {
      fullMarks: (theoryMarks !== undefined || practicalMarks !== undefined)
        ? ((theoryMarks !== undefined ? theoryMarks : classSubject.theoryMarks) + (practicalMarks !== undefined ? practicalMarks : classSubject.practicalMarks))
        : (fullMarks || classSubject.fullMarks),
      passMarks: passMarks || classSubject.passMarks,
      theoryMarks: theoryMarks !== undefined ? theoryMarks : classSubject.theoryMarks,
      practicalMarks: practicalMarks !== undefined ? practicalMarks : classSubject.practicalMarks,
      creditHours: creditHours || classSubject.creditHours,
    },
    include: {
      subject: true
    }
  });

  ApiResponse.success(res, updated, 'Class subject updated successfully');
});

/**
 * @desc    Remove subject from a class
 * @route   DELETE /api/v1/class-subjects/:id
 * @access  Private/Admin
 */
const removeSubjectFromClass = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const classSubject = await prisma.classSubject.findUnique({
    where: { id: parseInt(id) },
  });

  if (!classSubject) {
    throw ApiError.notFound('Class subject assignment not found');
  }

  // Check if teacher assigned
  const teacherCount = await prisma.teacherSubject.count({
    where: { classSubjectId: parseInt(id) },
  });

  if (teacherCount > 0) {
    throw ApiError.badRequest('Cannot remove subject - teachers are assigned to it');
  }

  // Check if exams exist
  const examCount = await prisma.examSubject.count({
    where: { classSubjectId: parseInt(id) },
  });

  if (examCount > 0) {
    throw ApiError.badRequest('Cannot remove subject - exams are linked to it');
  }

  await prisma.classSubject.delete({
    where: { id: parseInt(id) },
  });

  ApiResponse.success(res, null, 'Subject removed from class successfully');
});

module.exports = {
  getClassSubjects,
  assignSubjectToClass,
  updateClassSubject,
  removeSubjectFromClass,
};
