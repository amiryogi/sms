const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');

/**
 * @desc    Submit assignment (Student)
 * @route   POST /api/v1/submissions
 * @access  Private/Student
 */
const submitAssignment = asyncHandler(async (req, res) => {
  const { assignmentId, content } = req.body;
  const files = req.files;

  // Verify student profile
  const student = await prisma.student.findUnique({ where: { userId: req.user.id } });
  if (!student) throw ApiError.forbidden('Only students can submit assignments');

  // Verify assignment exists and is published
  const assignment = await prisma.assignment.findUnique({ where: { id: parseInt(assignmentId) } });
  if (!assignment || !assignment.isPublished) throw ApiError.notFound('Assignment not available');

  // Check if already submitted
  const existing = await prisma.submission.findFirst({
    where: { assignmentId: parseInt(assignmentId), studentId: student.id }
  });

  if (existing) throw ApiError.conflict('You have already submitted this assignment');

  const status = new Date() > new Date(assignment.dueDate) ? 'late' : 'submitted';

  const submission = await prisma.submission.create({
    data: {
      assignmentId: parseInt(assignmentId),
      studentId: student.id,
      content,
      status,
      submissionFiles: {
        create: files ? files.map(file => {
          // Normalizing path for local storage
          let fileUrl = file.path;
          if (!file.path.startsWith('http')) {
            // For local uploads, use relative path with forward slashes
            fileUrl = `uploads/${file.filename}`;
          }

          return {
            fileName: file.originalname,
            fileUrl: fileUrl, // Now clean: uploads/filename.ext
            fileType: file.mimetype,
            fileSize: file.size
          };
        }) : []
      }
    },
    include: { submissionFiles: true }
  });

  ApiResponse.created(res, submission, 'Assignment submitted successfully');
});

/**
 * @desc    Get submissions for an assignment (Teacher)
 * @route   GET /api/v1/submissions/assignment/:assignmentId
 * @access  Private/Teacher
 */
const getSubmissionsByAssignment = asyncHandler(async (req, res) => {
  const assignmentId = parseInt(req.params.assignmentId);

  // Verify teacher ownership
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { teacherSubject: true }
  });

  if (!assignment || (assignment.teacherSubject.userId !== req.user.id && !req.user.roles.includes('ADMIN'))) {
    throw ApiError.forbidden('Unauthorized');
  }

  const submissions = await prisma.submission.findMany({
    where: { assignmentId },
    include: {
      student: {
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } }
      },
      submissionFiles: true
    },
    orderBy: { submittedAt: 'desc' }
  });

  ApiResponse.success(res, submissions);
});

/**
 * @desc    Grade a submission
 * @route   PUT /api/v1/submissions/:id/grade
 * @access  Private/Teacher
 */
const gradeSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { marksObtained, feedback } = req.body;

  const submission = await prisma.submission.findUnique({
    where: { id: parseInt(id) },
    include: { assignment: { include: { teacherSubject: true } } }
  });

  if (!submission || (submission.assignment.teacherSubject.userId !== req.user.id && !req.user.roles.includes('ADMIN'))) {
    throw ApiError.forbidden('Unauthorized');
  }

  const updated = await prisma.submission.update({
    where: { id: parseInt(id) },
    data: {
      marksObtained: parseFloat(marksObtained),
      feedback,
      status: 'graded',
      gradedBy: req.user.id,
      gradedAt: new Date()
    }
  });

  ApiResponse.success(res, updated, 'Submission graded successfully');
});

module.exports = {
  submitAssignment,
  getSubmissionsByAssignment,
  gradeSubmission,
};
