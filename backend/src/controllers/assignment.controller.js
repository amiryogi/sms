const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');

/**
 * @desc    Get all assignments for a teacher or student
 * @route   GET /api/v1/assignments
 * @access  Private
 */
const getAssignments = asyncHandler(async (req, res) => {
  const { teacherSubjectId, classId, sectionId, academicYearId } = req.query;

  const where = {};

  if (req.user.roles.includes('TEACHER')) {
    where.teacherSubject = { userId: req.user.id };
  }

  if (teacherSubjectId) where.teacherSubjectId = parseInt(teacherSubjectId);
  
  // Scoping for student view
  if (classId || sectionId || academicYearId) {
    where.teacherSubject = {
      ...where.teacherSubject,
      sectionId: sectionId ? parseInt(sectionId) : undefined,
      classSubject: {
        classId: classId ? parseInt(classId) : undefined,
        academicYearId: academicYearId ? parseInt(academicYearId) : undefined,
      }
    };
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      teacherSubject: {
        include: {
          classSubject: { include: { class: true, subject: true } },
          section: true,
          user: { select: { firstName: true, lastName: true } }
        }
      },
      assignmentFiles: true,
      _count: { select: { submissions: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  ApiResponse.success(res, assignments);
});

/**
 * @desc    Get single assignment details
 * @route   GET /api/v1/assignments/:id
 * @access  Private
 */
const getAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const assignment = await prisma.assignment.findUnique({
    where: { id: parseInt(id) },
    include: {
      teacherSubject: {
        include: {
          classSubject: { include: { class: true, subject: true } },
          section: true,
          user: { select: { firstName: true, lastName: true } }
        }
      },
      assignmentFiles: true,
      submissions: req.user.roles.includes('STUDENT') ? {
        where: { student: { userId: req.user.id } },
        include: { submissionFiles: true }
      } : false
    }
  });

  if (!assignment) throw ApiError.notFound('Assignment not found');

  ApiResponse.success(res, assignment);
});

/**
 * @desc    Create assignment with multiple files
 * @route   POST /api/v1/assignments
 * @access  Private/Teacher
 */
const createAssignment = asyncHandler(async (req, res) => {
  const { title, description, dueDate, teacherSubjectId, totalMarks, isPublished } = req.body;
  const files = req.files; // Handled by multer

  // Verify teacher subject ownership
  const ts = await prisma.teacherSubject.findFirst({
    where: { id: parseInt(teacherSubjectId), userId: req.user.id }
  });

  if (!ts && !req.user.roles.includes('ADMIN')) {
    throw ApiError.forbidden('You are not authorized to create assignments for this subject');
  }

  const assignment = await prisma.assignment.create({
    data: {
      teacherSubjectId: parseInt(teacherSubjectId),
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      totalMarks: totalMarks ? parseInt(totalMarks) : 100,
      isPublished: isPublished === 'true' || isPublished === true,
      assignmentFiles: {
        create: files ? files.map(file => ({
          fileName: file.originalname,
          fileUrl: file.path || file.secure_url,
          fileType: file.mimetype,
          fileSize: file.size
        })) : []
      }
    },
    include: { assignmentFiles: true }
  });

  ApiResponse.created(res, assignment, 'Assignment created successfully');
});

/**
 * @desc    Update assignment
 * @route   PUT /api/v1/assignments/:id
 * @access  Private/Teacher
 */
const updateAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate, totalMarks, isPublished } = req.body;

  const assignment = await prisma.assignment.findUnique({
    where: { id: parseInt(id) },
    include: { teacherSubject: true }
  });

  if (!assignment || (assignment.teacherSubject.userId !== req.user.id && !req.user.roles.includes('ADMIN'))) {
    throw ApiError.forbidden('Unauthorized');
  }

  const updated = await prisma.assignment.update({
    where: { id: parseInt(id) },
    data: {
      title: title || assignment.title,
      description: description || assignment.description,
      dueDate: dueDate ? new Date(dueDate) : assignment.dueDate,
      totalMarks: totalMarks ? parseInt(totalMarks) : assignment.totalMarks,
      isPublished: isPublished !== undefined ? (isPublished === 'true' || isPublished === true) : assignment.isPublished,
    }
  });

  ApiResponse.success(res, updated, 'Assignment updated successfully');
});

/**
 * @desc    Delete assignment
 * @route   DELETE /api/v1/assignments/:id
 * @access  Private/Teacher
 */
const deleteAssignment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const assignment = await prisma.assignment.findUnique({
    where: { id: parseInt(id) },
    include: { teacherSubject: true }
  });

  if (!assignment || (assignment.teacherSubject.userId !== req.user.id && !req.user.roles.includes('ADMIN'))) {
    throw ApiError.forbidden('Unauthorized');
  }

  // Check for submissions
  const subCount = await prisma.submission.count({ where: { assignmentId: parseInt(id) } });
  if (subCount > 0) {
    throw ApiError.badRequest('Cannot delete assignment - students have already submitted work');
  }

  await prisma.assignment.delete({ where: { id: parseInt(id) } });

  ApiResponse.success(res, null, 'Assignment deleted successfully');
});

module.exports = {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment
};
