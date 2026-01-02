const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");

/**
 * @desc    Submit assignment (Student)
 * @route   POST /api/v1/submissions
 * @access  Private/Student
 */
const submitAssignment = asyncHandler(async (req, res) => {
  const { assignmentId, content } = req.body;
  const files = req.files;

  // Verify student profile
  const student = await prisma.student.findFirst({
    where: {
      userId: req.user.id,
      schoolId: req.user.schoolId,
    },
  });
  if (!student)
    throw ApiError.forbidden("Only students can submit assignments");

  // Verify assignment exists and is published
  const assignment = await prisma.assignment.findUnique({
    where: { id: parseInt(assignmentId) },
    include: {
      teacherSubject: {
        include: {
          classSubject: {
            include: { class: true },
          },
          section: true,
        },
      },
    },
  });
  if (!assignment || !assignment.isPublished)
    throw ApiError.notFound("Assignment not available");

  // School isolation
  if (
    assignment.teacherSubject.classSubject.class.schoolId !== req.user.schoolId
  ) {
    throw ApiError.forbidden("Assignment does not belong to your school");
  }

  // Ensure student is enrolled in the class/section for this assignment
  const studentClass = await prisma.studentClass.findFirst({
    where: {
      studentId: student.id,
      classId: assignment.teacherSubject.classSubject.classId,
      sectionId: assignment.teacherSubject.sectionId,
      academicYearId: assignment.teacherSubject.academicYearId,
      status: "active",
      schoolId: req.user.schoolId,
    },
  });

  if (!studentClass) {
    throw ApiError.forbidden(
      "You are not enrolled in this class/section for the current year"
    );
  }

  // Check if already submitted
  const existing = await prisma.submission.findFirst({
    where: { assignmentId: parseInt(assignmentId), studentId: student.id },
  });

  if (existing)
    throw ApiError.conflict("You have already submitted this assignment");

  const status =
    new Date() > new Date(assignment.dueDate) ? "late" : "submitted";

  const submission = await prisma.submission.create({
    data: {
      assignmentId: parseInt(assignmentId),
      studentId: student.id,
      studentClassId: studentClass.id,
      schoolId: req.user.schoolId,
      content,
      status,
      submissionFiles: {
        create: files
          ? files.map((file) => {
              // Normalizing path for local storage
              let fileUrl = file.path;
              if (!file.path.startsWith("http")) {
                // For local uploads, use relative path with forward slashes
                fileUrl = `uploads/${file.filename}`;
              }

              return {
                fileName: file.originalname,
                fileUrl: fileUrl, // Now clean: uploads/filename.ext
                fileType: file.mimetype,
                fileSize: file.size,
              };
            })
          : [],
      },
    },
    include: { submissionFiles: true },
  });

  ApiResponse.created(res, submission, "Assignment submitted successfully");
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
    include: { teacherSubject: true },
  });

  if (
    !assignment ||
    (assignment.teacherSubject.userId !== req.user.id &&
      !req.user.roles.includes("ADMIN"))
  ) {
    throw ApiError.forbidden("Unauthorized");
  }

  const submissions = await prisma.submission.findMany({
    where: { assignmentId },
    include: {
      student: {
        include: {
          user: {
            select: { firstName: true, lastName: true, avatarUrl: true },
          },
        },
      },
      submissionFiles: true,
    },
    orderBy: { submittedAt: "desc" },
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
    include: {
      assignment: {
        include: {
          teacherSubject: {
            include: {
              classSubject: { include: { class: true } },
              section: true,
            },
          },
        },
      },
    },
  });

  if (
    !submission ||
    (submission.assignment.teacherSubject.userId !== req.user.id &&
      !req.user.roles.includes("ADMIN"))
  ) {
    throw ApiError.forbidden("Unauthorized");
  }

  if (
    submission.assignment.teacherSubject.classSubject.class.schoolId !==
    req.user.schoolId
  ) {
    throw ApiError.forbidden("Submission does not belong to your school");
  }

  const numericMarks =
    marksObtained !== undefined && marksObtained !== null
      ? parseFloat(marksObtained)
      : null;

  if (numericMarks !== null) {
    if (Number.isNaN(numericMarks) || numericMarks < 0) {
      throw ApiError.badRequest("Marks must be a non-negative number");
    }
    if (
      submission.assignment.totalMarks &&
      numericMarks > submission.assignment.totalMarks
    ) {
      throw ApiError.badRequest(
        `Marks cannot exceed ${submission.assignment.totalMarks}`
      );
    }
  }

  const updated = await prisma.submission.update({
    where: { id: parseInt(id) },
    data: {
      marksObtained: numericMarks,
      feedback,
      status: "graded",
      gradedBy: req.user.id,
      gradedAt: new Date(),
    },
  });

  ApiResponse.success(res, updated, "Submission graded successfully");
});

module.exports = {
  submitAssignment,
  getSubmissionsByAssignment,
  gradeSubmission,
};
