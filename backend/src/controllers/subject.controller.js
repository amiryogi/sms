const prisma = require('../config/database');
const { ApiError, ApiResponse, asyncHandler, buildSearchQuery } = require('../utils');

/**
 * @desc    Get all subjects
 * @route   GET /api/v1/subjects
 * @access  Private
 */
const getSubjects = asyncHandler(async (req, res) => {
  const { search } = req.query;

  const where = { schoolId: req.user.schoolId };

  if (search) {
    const searchQuery = buildSearchQuery(search, ['name', 'code']);
    if (searchQuery) where.OR = searchQuery.OR;
  }

  const subjects = await prisma.subject.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  ApiResponse.success(res, subjects);
});

/**
 * @desc    Get single subject
 * @route   GET /api/v1/subjects/:id
 * @access  Private
 */
const getSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const subject = await prisma.subject.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!subject) {
    throw ApiError.notFound('Subject not found');
  }

  ApiResponse.success(res, subject);
});

/**
 * @desc    Create subject
 * @route   POST /api/v1/subjects
 * @access  Private/Admin
 */
const createSubject = asyncHandler(async (req, res) => {
  const { name, code, description, isOptional, creditHours, hasPractical } = req.body;

  const existingSubject = await prisma.subject.findFirst({
    where: { schoolId: req.user.schoolId, code },
  });

  if (existingSubject) {
    throw ApiError.conflict('Subject with this code already exists');
  }

  const subject = await prisma.subject.create({
    data: {
      schoolId: req.user.schoolId,
      name,
      code,
      description,
      description,
      isOptional: !!isOptional,
      creditHours: creditHours || 3.0,
      hasPractical: !!hasPractical,
    },
  });

  ApiResponse.created(res, subject, 'Subject created successfully');
});

/**
 * @desc    Update subject
 * @route   PUT /api/v1/subjects/:id
 * @access  Private/Admin
 */
const updateSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, code, description, isOptional, creditHours, hasPractical } = req.body;

  const subject = await prisma.subject.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!subject) {
    throw ApiError.notFound('Subject not found');
  }

  // Check code uniqueness if changed
  if (code && code !== subject.code) {
    const existingSubject = await prisma.subject.findFirst({
      where: { schoolId: req.user.schoolId, code, NOT: { id: parseInt(id) } },
    });

    if (existingSubject) {
      throw ApiError.conflict('Subject code already in use');
    }
  }

  const updatedSubject = await prisma.subject.update({
    where: { id: parseInt(id) },
    data: {
      name: name || subject.name,
      code: code || subject.code,
      description: description !== undefined ? description : subject.description,
      isOptional: isOptional !== undefined ? isOptional : subject.isOptional,
      creditHours: creditHours !== undefined ? creditHours : subject.creditHours,
      hasPractical: hasPractical !== undefined ? hasPractical : subject.hasPractical,
    },
  });

  ApiResponse.success(res, updatedSubject, 'Subject updated successfully');
});

/**
 * @desc    Delete subject
 * @route   DELETE /api/v1/subjects/:id
 * @access  Private/Admin
 */
const deleteSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const subject = await prisma.subject.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!subject) {
    throw ApiError.notFound('Subject not found');
  }

  // Check for usage in class_subjects
  const usage = await prisma.classSubject.count({
    where: { subjectId: parseInt(id) },
  });

  if (usage > 0) {
    throw ApiError.badRequest('Cannot delete subject used in academic years');
  }

  await prisma.subject.delete({
    where: { id: parseInt(id) },
  });

  ApiResponse.success(res, null, 'Subject deleted successfully');
});

module.exports = {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
};
