const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");

/**
 * @desc    Get all subject components for a class (NEB Grade 11-12 only)
 * @route   GET /api/v1/subject-components
 * @access  Private
 */
const getSubjectComponents = asyncHandler(async (req, res) => {
  const { classId, subjectId } = req.query;

  // Build where clause
  const where = {};

  if (classId) {
    where.classId = parseInt(classId);
  }

  if (subjectId) {
    where.subjectId = parseInt(subjectId);
  }

  const components = await prisma.subjectComponent.findMany({
    where,
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          gradeLevel: true,
        },
      },
    },
    orderBy: [
      { classId: "asc" },
      { subjectId: "asc" },
      { type: "asc" },
    ],
  });

  ApiResponse.success(res, components);
});

/**
 * @desc    Get a single subject component by ID
 * @route   GET /api/v1/subject-components/:id
 * @access  Private
 */
const getSubjectComponentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const component = await prisma.subjectComponent.findUnique({
    where: { id: parseInt(id) },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          gradeLevel: true,
        },
      },
    },
  });

  if (!component) {
    throw ApiError.notFound("Subject component not found");
  }

  ApiResponse.success(res, component);
});

/**
 * @desc    Get subject components for a specific subject in a class
 * @route   GET /api/v1/subject-components/class/:classId/subject/:subjectId
 * @access  Private
 */
const getComponentsBySubject = asyncHandler(async (req, res) => {
  const { classId, subjectId } = req.params;

  const components = await prisma.subjectComponent.findMany({
    where: {
      classId: parseInt(classId),
      subjectId: parseInt(subjectId),
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          gradeLevel: true,
        },
      },
    },
    orderBy: { type: "asc" },
  });

  ApiResponse.success(res, components);
});

/**
 * @desc    Create a new subject component (NEB Grade 11-12 only)
 * @route   POST /api/v1/subject-components
 * @access  Private/Admin
 */
const createSubjectComponent = asyncHandler(async (req, res) => {
  const { subjectId, classId, type, subjectCode, fullMarks, passMarks, creditHours } = req.body;

  // Verify class exists and is Grade 11 or 12
  const classData = await prisma.class.findFirst({
    where: { id: parseInt(classId), schoolId: req.user.schoolId },
  });

  if (!classData) {
    throw ApiError.notFound("Class not found in your school");
  }

  if (classData.gradeLevel < 11) {
    throw ApiError.badRequest(
      "Subject components are only supported for NEB Grade 11 and 12. Use ClassSubject for lower grades."
    );
  }

  // Verify subject exists
  const subject = await prisma.subject.findFirst({
    where: { id: parseInt(subjectId), schoolId: req.user.schoolId },
  });

  if (!subject) {
    throw ApiError.notFound("Subject not found in your school");
  }

  // Validate NEB rules
  if (passMarks > fullMarks) {
    throw ApiError.badRequest("Pass marks cannot exceed full marks");
  }

  if (creditHours <= 0) {
    throw ApiError.badRequest("Credit hours must be greater than 0");
  }

  // Check for duplicate (same class, subject, type)
  const existing = await prisma.subjectComponent.findUnique({
    where: {
      classId_subjectId_type: {
        classId: parseInt(classId),
        subjectId: parseInt(subjectId),
        type: type,
      },
    },
  });

  if (existing) {
    throw ApiError.conflict(
      `A ${type} component already exists for this subject in this class`
    );
  }

  const component = await prisma.subjectComponent.create({
    data: {
      subjectId: parseInt(subjectId),
      classId: parseInt(classId),
      type,
      subjectCode,
      fullMarks: parseInt(fullMarks),
      passMarks: parseInt(passMarks),
      creditHours: parseFloat(creditHours),
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          gradeLevel: true,
        },
      },
    },
  });

  ApiResponse.created(res, component, "Subject component created successfully");
});

/**
 * @desc    Update a subject component
 * @route   PUT /api/v1/subject-components/:id
 * @access  Private/Admin
 */
const updateSubjectComponent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subjectCode, fullMarks, passMarks, creditHours } = req.body;

  const component = await prisma.subjectComponent.findUnique({
    where: { id: parseInt(id) },
    include: {
      class: true,
    },
  });

  if (!component) {
    throw ApiError.notFound("Subject component not found");
  }

  if (component.class.schoolId !== req.user.schoolId) {
    throw ApiError.forbidden("Subject component does not belong to your school");
  }

  // Validate NEB rules
  const newFullMarks = fullMarks !== undefined ? parseInt(fullMarks) : component.fullMarks;
  const newPassMarks = passMarks !== undefined ? parseInt(passMarks) : component.passMarks;
  const newCreditHours = creditHours !== undefined ? parseFloat(creditHours) : component.creditHours;

  if (newPassMarks > newFullMarks) {
    throw ApiError.badRequest("Pass marks cannot exceed full marks");
  }

  if (newCreditHours <= 0) {
    throw ApiError.badRequest("Credit hours must be greater than 0");
  }

  const updated = await prisma.subjectComponent.update({
    where: { id: parseInt(id) },
    data: {
      subjectCode: subjectCode || component.subjectCode,
      fullMarks: newFullMarks,
      passMarks: newPassMarks,
      creditHours: newCreditHours,
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      class: {
        select: {
          id: true,
          name: true,
          gradeLevel: true,
        },
      },
    },
  });

  ApiResponse.success(res, updated, "Subject component updated successfully");
});

/**
 * @desc    Delete a subject component
 * @route   DELETE /api/v1/subject-components/:id
 * @access  Private/Admin
 */
const deleteSubjectComponent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const component = await prisma.subjectComponent.findUnique({
    where: { id: parseInt(id) },
    include: {
      class: true,
    },
  });

  if (!component) {
    throw ApiError.notFound("Subject component not found");
  }

  if (component.class.schoolId !== req.user.schoolId) {
    throw ApiError.forbidden("Subject component does not belong to your school");
  }

  // TODO: In future, check if marks exist for this component before deleting

  await prisma.subjectComponent.delete({
    where: { id: parseInt(id) },
  });

  ApiResponse.success(res, null, "Subject component deleted successfully");
});

/**
 * @desc    Get NEB-eligible classes (Grade 11 and 12)
 * @route   GET /api/v1/subject-components/neb-classes
 * @access  Private
 */
const getNEBClasses = asyncHandler(async (req, res) => {
  const classes = await prisma.class.findMany({
    where: {
      schoolId: req.user.schoolId,
      gradeLevel: { gte: 11 },
    },
    orderBy: { gradeLevel: "asc" },
  });

  ApiResponse.success(res, classes);
});

module.exports = {
  getSubjectComponents,
  getSubjectComponentById,
  getComponentsBySubject,
  createSubjectComponent,
  updateSubjectComponent,
  deleteSubjectComponent,
  getNEBClasses,
};
