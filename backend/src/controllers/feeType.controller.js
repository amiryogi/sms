const prisma = require("../config/database");
const {
  ApiError,
  ApiResponse,
  asyncHandler,
  buildSearchQuery,
} = require("../utils");
const { getFeeManagementRole } = require("../middleware");

/**
 * @desc    Get all fee types
 * @route   GET /api/v1/fees/types
 * @access  Private (Admin, Student, Parent)
 */
const getFeeTypes = asyncHandler(async (req, res) => {
  const { search, isActive } = req.query;

  const where = { schoolId: req.user.schoolId };

  if (search) {
    const searchQuery = buildSearchQuery(search, ["name", "description"]);
    if (searchQuery) where.OR = searchQuery.OR;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === "true";
  }

  const feeTypes = await prisma.feeType.findMany({
    where,
    orderBy: { name: "asc" },
  });

  ApiResponse.success(res, feeTypes);
});

/**
 * @desc    Get single fee type
 * @route   GET /api/v1/fees/types/:id
 * @access  Private (Admin, Student, Parent)
 */
const getFeeType = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const feeType = await prisma.feeType.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
    include: {
      feeStructures: {
        include: {
          class: { select: { id: true, name: true } },
          academicYear: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!feeType) {
    throw ApiError.notFound("Fee type not found");
  }

  ApiResponse.success(res, feeType);
});

/**
 * @desc    Create fee type
 * @route   POST /api/v1/fees/types
 * @access  Private/Admin or Accountant
 */
const createFeeType = asyncHandler(async (req, res) => {
  const { name, description, isActive } = req.body;
  const actorRole = getFeeManagementRole(req.user);

  // Check for duplicate name
  const existingFeeType = await prisma.feeType.findFirst({
    where: { schoolId: req.user.schoolId, name },
  });

  if (existingFeeType) {
    throw ApiError.conflict("Fee type with this name already exists");
  }

  const feeType = await prisma.feeType.create({
    data: {
      schoolId: req.user.schoolId,
      name,
      description,
      isActive: isActive !== undefined ? isActive : true,
      createdByUserId: req.user.id,
      updatedByUserId: req.user.id,
      actorRole,
    },
  });

  ApiResponse.created(res, feeType, "Fee type created successfully");
});

/**
 * @desc    Update fee type
 * @route   PUT /api/v1/fees/types/:id
 * @access  Private/Admin or Accountant
 */
const updateFeeType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;
  const actorRole = getFeeManagementRole(req.user);

  const feeType = await prisma.feeType.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!feeType) {
    throw ApiError.notFound("Fee type not found");
  }

  // Check name uniqueness if changed
  if (name && name !== feeType.name) {
    const existingFeeType = await prisma.feeType.findFirst({
      where: { schoolId: req.user.schoolId, name, NOT: { id: parseInt(id) } },
    });

    if (existingFeeType) {
      throw ApiError.conflict("Fee type name already in use");
    }
  }

  const updatedFeeType = await prisma.feeType.update({
    where: { id: parseInt(id) },
    data: {
      name: name !== undefined ? name : feeType.name,
      description:
        description !== undefined ? description : feeType.description,
      isActive: isActive !== undefined ? isActive : feeType.isActive,
      updatedByUserId: req.user.id,
      actorRole,
    },
  });

  ApiResponse.success(res, updatedFeeType, "Fee type updated successfully");
});

/**
 * @desc    Delete fee type
 * @route   DELETE /api/v1/fees/types/:id
 * @access  Private/Admin
 */
const deleteFeeType = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const feeType = await prisma.feeType.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!feeType) {
    throw ApiError.notFound("Fee type not found");
  }

  // Check for usage in fee structures
  const usage = await prisma.feeStructure.count({
    where: { feeTypeId: parseInt(id) },
  });

  if (usage > 0) {
    throw ApiError.badRequest(
      "Cannot delete fee type that has fee structures. Deactivate it instead."
    );
  }

  await prisma.feeType.delete({
    where: { id: parseInt(id) },
  });

  ApiResponse.success(res, null, "Fee type deleted successfully");
});

module.exports = {
  getFeeTypes,
  getFeeType,
  createFeeType,
  updateFeeType,
  deleteFeeType,
};
