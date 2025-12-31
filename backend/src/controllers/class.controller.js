const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');

/**
 * @desc    Get all classes
 * @route   GET /api/v1/classes
 * @access  Private
 */
const getClasses = asyncHandler(async (req, res) => {
  const classes = await prisma.class.findMany({
    where: { schoolId: req.user.schoolId },
    orderBy: { displayOrder: 'asc' },
  });

  ApiResponse.success(res, classes);
});

/**
 * @desc    Get single class
 * @route   GET /api/v1/classes/:id
 * @access  Private
 */
const getClass = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const classObj = await prisma.class.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
    include: {
      classSubjects: {
        where: {
          academicYear: { isCurrent: true }
        },
        include: {
          subject: true
        }
      }
    }
  });

  if (!classObj) {
    throw ApiError.notFound('Class not found');
  }

  ApiResponse.success(res, classObj);
});

/**
 * @desc    Create class
 * @route   POST /api/v1/classes
 * @access  Private/Admin
 */
const createClass = asyncHandler(async (req, res) => {
  const { name, gradeLevel, displayOrder } = req.body;

  const existingClass = await prisma.class.findFirst({
    where: { schoolId: req.user.schoolId, name },
  });

  if (existingClass) {
    throw ApiError.conflict('Class with this name already exists');
  }

  const newClass = await prisma.class.create({
    data: {
      schoolId: req.user.schoolId,
      name,
      gradeLevel,
      displayOrder: displayOrder || 0,
    },
  });

  ApiResponse.created(res, newClass, 'Class created successfully');
});

/**
 * @desc    Update class
 * @route   PUT /api/v1/classes/:id
 * @access  Private/Admin
 */
const updateClass = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, gradeLevel, displayOrder } = req.body;

  const classObj = await prisma.class.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!classObj) {
    throw ApiError.notFound('Class not found');
  }

  const updatedClass = await prisma.class.update({
    where: { id: parseInt(id) },
    data: {
      name: name || classObj.name,
      gradeLevel: gradeLevel !== undefined ? gradeLevel : classObj.gradeLevel,
      displayOrder: displayOrder !== undefined ? displayOrder : classObj.displayOrder,
    },
  });

  ApiResponse.success(res, updatedClass, 'Class updated successfully');
});

/**
 * @desc    Delete class
 * @route   DELETE /api/v1/classes/:id
 * @access  Private/Admin
 */
const deleteClass = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const classObj = await prisma.class.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!classObj) {
    throw ApiError.notFound('Class not found');
  }

  // Check for related records
  const studentClasses = await prisma.studentClass.count({
    where: { classId: parseInt(id) },
  });

  if (studentClasses > 0) {
    throw ApiError.badRequest('Cannot delete class with enrolled students');
  }

  await prisma.class.delete({
    where: { id: parseInt(id) },
  });

  ApiResponse.success(res, null, 'Class deleted successfully');
});

module.exports = {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
};
