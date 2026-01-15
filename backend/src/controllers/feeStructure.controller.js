const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");

/**
 * @desc    Get all fee structures
 * @route   GET /api/v1/fees/structures
 * @access  Private (Admin, Student, Parent)
 */
const getFeeStructures = asyncHandler(async (req, res) => {
  const { classId, academicYearId, feeTypeId } = req.query;

  const where = { schoolId: req.user.schoolId };

  if (classId) where.classId = parseInt(classId);
  if (academicYearId) where.academicYearId = parseInt(academicYearId);
  if (feeTypeId) where.feeTypeId = parseInt(feeTypeId);

  const feeStructures = await prisma.feeStructure.findMany({
    where,
    include: {
      feeType: { select: { id: true, name: true, isActive: true } },
      class: { select: { id: true, name: true, gradeLevel: true } },
      academicYear: { select: { id: true, name: true, isCurrent: true } },
    },
    orderBy: [
      { academicYear: { name: "desc" } },
      { class: { gradeLevel: "asc" } },
      { feeType: { name: "asc" } },
    ],
  });

  ApiResponse.success(res, feeStructures);
});

/**
 * @desc    Get fee structures for a specific class and year
 * @route   GET /api/v1/fees/structures/by-class/:classId/:academicYearId
 * @access  Private (Admin, Student, Parent)
 */
const getFeeStructuresByClass = asyncHandler(async (req, res) => {
  const { classId, academicYearId } = req.params;

  const feeStructures = await prisma.feeStructure.findMany({
    where: {
      schoolId: req.user.schoolId,
      classId: parseInt(classId),
      academicYearId: parseInt(academicYearId),
    },
    include: {
      feeType: { select: { id: true, name: true, isActive: true } },
    },
    orderBy: { feeType: { name: "asc" } },
  });

  // Calculate total
  const total = feeStructures.reduce(
    (sum, fs) => sum + parseFloat(fs.amount),
    0
  );

  ApiResponse.success(res, { feeStructures, total });
});

/**
 * @desc    Get single fee structure
 * @route   GET /api/v1/fees/structures/:id
 * @access  Private (Admin, Student, Parent)
 */
const getFeeStructure = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const feeStructure = await prisma.feeStructure.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
    include: {
      feeType: true,
      class: true,
      academicYear: true,
    },
  });

  if (!feeStructure) {
    throw ApiError.notFound("Fee structure not found");
  }

  ApiResponse.success(res, feeStructure);
});

/**
 * @desc    Create fee structure
 * @route   POST /api/v1/fees/structures
 * @access  Private/Admin
 */
const createFeeStructure = asyncHandler(async (req, res) => {
  const { feeTypeId, classId, academicYearId, amount } = req.body;
  const schoolId = req.user.schoolId;

  // Validate feeType exists and belongs to school
  const feeType = await prisma.feeType.findFirst({
    where: { id: feeTypeId, schoolId },
  });
  if (!feeType) {
    throw ApiError.notFound("Fee type not found");
  }

  // Validate class exists and belongs to school
  const classRecord = await prisma.class.findFirst({
    where: { id: classId, schoolId },
  });
  if (!classRecord) {
    throw ApiError.notFound("Class not found");
  }

  // Validate academic year exists and belongs to school
  const academicYear = await prisma.academicYear.findFirst({
    where: { id: academicYearId, schoolId },
  });
  if (!academicYear) {
    throw ApiError.notFound("Academic year not found");
  }

  // Check for duplicate (unique constraint: feeTypeId + classId + academicYearId)
  const existing = await prisma.feeStructure.findFirst({
    where: { feeTypeId, classId, academicYearId },
  });
  if (existing) {
    throw ApiError.conflict(
      `Fee structure for "${feeType.name}" in "${classRecord.name}" for "${academicYear.name}" already exists`
    );
  }

  const feeStructure = await prisma.feeStructure.create({
    data: {
      schoolId,
      feeTypeId,
      classId,
      academicYearId,
      amount: parseFloat(amount),
    },
    include: {
      feeType: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
      academicYear: { select: { id: true, name: true } },
    },
  });

  ApiResponse.created(res, feeStructure, "Fee structure created successfully");
});

/**
 * @desc    Update fee structure (amount only)
 * @route   PUT /api/v1/fees/structures/:id
 * @access  Private/Admin
 */
const updateFeeStructure = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  const feeStructure = await prisma.feeStructure.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!feeStructure) {
    throw ApiError.notFound("Fee structure not found");
  }

  // Check if any payments exist for this structure
  const paymentsExist = await prisma.feePayment.count({
    where: { feeStructureId: parseInt(id) },
  });

  if (paymentsExist > 0) {
    throw ApiError.badRequest(
      "Cannot modify fee structure with existing payments. Create a new structure instead."
    );
  }

  const updatedFeeStructure = await prisma.feeStructure.update({
    where: { id: parseInt(id) },
    data: {
      amount: amount !== undefined ? parseFloat(amount) : feeStructure.amount,
    },
    include: {
      feeType: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
      academicYear: { select: { id: true, name: true } },
    },
  });

  ApiResponse.success(
    res,
    updatedFeeStructure,
    "Fee structure updated successfully"
  );
});

/**
 * @desc    Delete fee structure
 * @route   DELETE /api/v1/fees/structures/:id
 * @access  Private/Admin
 */
const deleteFeeStructure = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const feeStructure = await prisma.feeStructure.findFirst({
    where: { id: parseInt(id), schoolId: req.user.schoolId },
  });

  if (!feeStructure) {
    throw ApiError.notFound("Fee structure not found");
  }

  // Check if any payments exist
  const paymentsExist = await prisma.feePayment.count({
    where: { feeStructureId: parseInt(id) },
  });

  if (paymentsExist > 0) {
    throw ApiError.badRequest(
      "Cannot delete fee structure with existing payments"
    );
  }

  await prisma.feeStructure.delete({
    where: { id: parseInt(id) },
  });

  ApiResponse.success(res, null, "Fee structure deleted successfully");
});

/**
 * @desc    Bulk create fee structures for a class
 * @route   POST /api/v1/fees/structures/bulk
 * @access  Private/Admin
 */
const bulkCreateFeeStructures = asyncHandler(async (req, res) => {
  const { classId, academicYearId, fees } = req.body;
  const schoolId = req.user.schoolId;

  // Validate class
  const classRecord = await prisma.class.findFirst({
    where: { id: classId, schoolId },
  });
  if (!classRecord) {
    throw ApiError.notFound("Class not found");
  }

  // Validate academic year
  const academicYear = await prisma.academicYear.findFirst({
    where: { id: academicYearId, schoolId },
  });
  if (!academicYear) {
    throw ApiError.notFound("Academic year not found");
  }

  // Validate all fee types
  const feeTypeIds = fees.map((f) => f.feeTypeId);
  const feeTypes = await prisma.feeType.findMany({
    where: { id: { in: feeTypeIds }, schoolId },
  });

  if (feeTypes.length !== feeTypeIds.length) {
    throw ApiError.badRequest("One or more fee types not found");
  }

  // Check for existing structures
  const existingStructures = await prisma.feeStructure.findMany({
    where: {
      classId,
      academicYearId,
      feeTypeId: { in: feeTypeIds },
    },
  });

  if (existingStructures.length > 0) {
    const existingTypeIds = existingStructures.map((s) => s.feeTypeId);
    const existingNames = feeTypes
      .filter((ft) => existingTypeIds.includes(ft.id))
      .map((ft) => ft.name);
    throw ApiError.conflict(
      `Fee structures already exist for: ${existingNames.join(", ")}`
    );
  }

  // Create all fee structures
  const createdStructures = await prisma.$transaction(
    fees.map((fee) =>
      prisma.feeStructure.create({
        data: {
          schoolId,
          feeTypeId: fee.feeTypeId,
          classId,
          academicYearId,
          amount: parseFloat(fee.amount),
        },
      })
    )
  );

  ApiResponse.created(
    res,
    createdStructures,
    `${createdStructures.length} fee structures created successfully`
  );
});

module.exports = {
  getFeeStructures,
  getFeeStructuresByClass,
  getFeeStructure,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  bulkCreateFeeStructures,
};
