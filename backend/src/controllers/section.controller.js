const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler } = require('../utils');

/**
 * @desc    Get all sections
 * @route   GET /api/v1/sections
 * @access  Private
 */
const getSections = asyncHandler(async (req, res) => {
  const sections = await prisma.section.findMany({
    where: { schoolId: req.user.schoolId },
    orderBy: { name: 'asc' },
  });

  ApiResponse.success(res, sections);
});

/**
 * @desc    Get single section
 * @route   GET /api/v1/sections/:id
 * @access  Private
 */
const getSection = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const section = await prisma.section.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!section) {
    throw ApiError.notFound('Section not found');
  }

  ApiResponse.success(res, section);
});

/**
 * @desc    Create section
 * @route   POST /api/v1/sections
 * @access  Private/Admin
 */
const createSection = asyncHandler(async (req, res) => {
  const { name, capacity } = req.body;

  const existingSection = await prisma.section.findFirst({
    where: { schoolId: req.user.schoolId, name },
  });

  if (existingSection) {
    throw ApiError.conflict('Section with this name already exists');
  }

  const section = await prisma.section.create({
    data: {
      schoolId: req.user.schoolId,
      name,
      capacity: capacity || 40,
    },
  });

  ApiResponse.created(res, section, 'Section created successfully');
});

/**
 * @desc    Update section
 * @route   PUT /api/v1/sections/:id
 * @access  Private/Admin
 */
const updateSection = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, capacity } = req.body;

  const section = await prisma.section.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!section) {
    throw ApiError.notFound('Section not found');
  }

  const updatedSection = await prisma.section.update({
    where: { id: parseInt(id) },
    data: {
      name: name || section.name,
      capacity: capacity !== undefined ? capacity : section.capacity,
    },
  });

  ApiResponse.success(res, updatedSection, 'Section updated successfully');
});

/**
 * @desc    Delete section
 * @route   DELETE /api/v1/sections/:id
 * @access  Private/Admin
 */
const deleteSection = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const section = await prisma.section.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!section) {
    throw ApiError.notFound('Section not found');
  }

  // Check for related records
  const studentClasses = await prisma.studentClass.count({
    where: { sectionId: parseInt(id) },
  });

  if (studentClasses > 0) {
    throw ApiError.badRequest('Cannot delete section with enrolled students');
  }

  await prisma.section.delete({
    where: { id: parseInt(id) },
  });

  ApiResponse.success(res, null, 'Section deleted successfully');
});

module.exports = {
  getSections,
  getSection,
  createSection,
  updateSection,
  deleteSection,
};
