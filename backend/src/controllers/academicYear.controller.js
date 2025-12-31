const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');

/**
 * @desc    Get all academic years
 * @route   GET /api/v1/academic-years
 * @access  Private
 */
const getAcademicYears = asyncHandler(async (req, res) => {
  const academicYears = await prisma.academicYear.findMany({
    where: { schoolId: req.user.schoolId },
    orderBy: { startDate: 'desc' },
  });

  ApiResponse.success(res, academicYears);
});

/**
 * @desc    Get current academic year
 * @route   GET /api/v1/academic-years/current
 * @access  Private
 */
const getCurrentAcademicYear = asyncHandler(async (req, res) => {
  const currentYear = await prisma.academicYear.findFirst({
    where: { 
      schoolId: req.user.schoolId,
      isCurrent: true 
    },
  });

  if (!currentYear) {
    throw ApiError.notFound('No current academic year set');
  }

  ApiResponse.success(res, currentYear);
});

/**
 * @desc    Create academic year
 * @route   POST /api/v1/academic-years
 * @access  Private/Admin
 */
const createAcademicYear = asyncHandler(async (req, res) => {
  const { name, startDate, endDate, isCurrent } = req.body;

  // Check if year with same name exists
  const existingYear = await prisma.academicYear.findFirst({
    where: { schoolId: req.user.schoolId, name },
  });

  if (existingYear) {
    throw ApiError.conflict('Academic year with this name already exists');
  }

  // If setting as current, unset others
  if (isCurrent) {
    await prisma.academicYear.updateMany({
      where: { schoolId: req.user.schoolId, isCurrent: true },
      data: { isCurrent: false },
    });
  }

  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId: req.user.schoolId,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isCurrent: !!isCurrent,
    },
  });

  ApiResponse.created(res, academicYear, 'Academic year created successfully');
});

/**
 * @desc    Update academic year
 * @route   PUT /api/v1/academic-years/:id
 * @access  Private/Admin
 */
const updateAcademicYear = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, startDate, endDate, isCurrent } = req.body;

  const year = await prisma.academicYear.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!year) {
    throw ApiError.notFound('Academic year not found');
  }

  // If setting as current, unset others
  if (isCurrent && !year.isCurrent) {
    await prisma.academicYear.updateMany({
      where: { schoolId: req.user.schoolId, isCurrent: true },
      data: { isCurrent: false },
    });
  }

  const updatedYear = await prisma.academicYear.update({
    where: { id: parseInt(id) },
    data: {
      name: name || year.name,
      startDate: startDate ? new Date(startDate) : year.startDate,
      endDate: endDate ? new Date(endDate) : year.endDate,
      isCurrent: isCurrent !== undefined ? isCurrent : year.isCurrent,
    },
  });

  ApiResponse.success(res, updatedYear, 'Academic year updated successfully');
});

/**
 * @desc    Delete academic year
 * @route   DELETE /api/v1/academic-years/:id
 * @access  Private/Admin
 */
const deleteAcademicYear = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const year = await prisma.academicYear.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!year) {
    throw ApiError.notFound('Academic year not found');
  }

  // Check if it has related records (optional, Prisma handles via constraints)
  // But let's check for active students/classes to be safe
  const studentClasses = await prisma.studentClass.count({
    where: { academicYearId: parseInt(id) },
  });

  if (studentClasses > 0) {
    throw ApiError.badRequest('Cannot delete academic year with enrolled students');
  }

  await prisma.academicYear.delete({
    where: { id: parseInt(id) },
  });

  ApiResponse.success(res, null, 'Academic year deleted successfully');
});

module.exports = {
  getAcademicYears,
  getCurrentAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
};
