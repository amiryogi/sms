const prisma = require("../config/database");
const { ApiError, ApiResponse, asyncHandler } = require("../utils");
const {
  GRADE_SCALE_PRESETS,
  normalizeScale,
  validateScale,
} = require("../utils/gradeScale");

/**
 * Grade scale management (School Settings -> Grade Scales).
 *
 * A scale that any report card was generated with is frozen: its bands and
 * pass percentage are the basis of cards already handed to parents. To change
 * it, the admin duplicates it, edits the copy, and makes the copy the default.
 */

const withBands = {
  bands: { orderBy: { minPercent: "desc" } },
  _count: { select: { reportCards: true } },
};

/** API shape: plain numbers, plus whether the scale may still be edited. */
const formatScale = (row) => {
  const scale = normalizeScale(row);
  const reportCardCount = row._count?.reportCards ?? 0;
  return {
    id: row.id,
    name: row.name,
    passPercent: scale.passPercent,
    isDefault: row.isDefault,
    failGrade: scale.failGrade,
    reportCardCount,
    isLocked: reportCardCount > 0,
    bands: scale.bands,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const toBandRows = (bands) =>
  bands.map((b) => ({
    minPercent: Number(b.min),
    maxPercent: Number(b.max),
    grade: String(b.grade).trim(),
    gradePoint: Number(b.gpa),
    description: b.description ? String(b.description).trim() : null,
    isPassing: b.isPassing !== false,
  }));

/** Validate the body, throwing 400 with per-field errors the form can show. */
const assertValid = (body) => {
  const errors = validateScale(body);
  if (errors.length) {
    throw ApiError.badRequest("The grade scale is not valid", errors);
  }
};

const findOwnScale = async (id, schoolId) => {
  const scale = await prisma.gradeScale.findFirst({
    where: { id, schoolId },
    include: withBands,
  });
  if (!scale) throw ApiError.notFound("Grade scale not found");
  return scale;
};

const assertNameFree = async (schoolId, name, exceptId = null) => {
  const clash = await prisma.gradeScale.findFirst({
    where: {
      schoolId,
      name: String(name).trim(),
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });
  if (clash) throw ApiError.conflict(`A grade scale named "${name}" already exists`);
};

/**
 * @desc    List the school's grade scales with their bands
 * @route   GET /api/v1/grade-scales
 * @access  Private/Admin
 */
const listGradeScales = asyncHandler(async (req, res) => {
  const rows = await prisma.gradeScale.findMany({
    where: { schoolId: req.user.schoolId },
    include: withBands,
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  ApiResponse.success(res, rows.map(formatScale));
});

/**
 * @desc    The built-in presets an admin can start a scale from
 * @route   GET /api/v1/grade-scales/presets
 * @access  Private/Admin
 */
const listPresets = asyncHandler(async (req, res) => {
  ApiResponse.success(
    res,
    Object.values(GRADE_SCALE_PRESETS).map((p) => ({
      key: p.key,
      name: p.name,
      passPercent: p.passPercent,
      bands: p.bands,
    })),
  );
});

/**
 * @desc    Create a grade scale
 * @route   POST /api/v1/grade-scales
 * @access  Private/Admin
 * @body    { name, passPercent, bands: [{ min, max, grade, gpa, description, isPassing }], isDefault? }
 */
const createGradeScale = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const { name, passPercent, bands, isDefault } = req.body;

  assertValid({ name, passPercent, bands });
  await assertNameFree(schoolId, name);

  // The first scale a school creates becomes its default.
  const existingCount = await prisma.gradeScale.count({ where: { schoolId } });
  const makeDefault = Boolean(isDefault) || existingCount === 0;

  const created = await prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.gradeScale.updateMany({
        where: { schoolId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.gradeScale.create({
      data: {
        schoolId,
        name: String(name).trim(),
        passPercent: Number(passPercent),
        isDefault: makeDefault,
        bands: { create: toBandRows(bands) },
      },
      include: withBands,
    });
  });

  ApiResponse.created(res, formatScale(created), "Grade scale created");
});

/**
 * @desc    Edit a grade scale. Refused once a report card uses it.
 * @route   PUT /api/v1/grade-scales/:id
 * @access  Private/Admin
 */
const updateGradeScale = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id, 10);
  const existing = await findOwnScale(id, schoolId);

  if (existing._count.reportCards > 0) {
    throw ApiError.conflict(
      `This scale was used for ${existing._count.reportCards} report card(s) and can no longer be edited. ` +
        "Duplicate it, edit the copy, and make the copy the default.",
    );
  }

  const { name, passPercent, bands } = req.body;
  assertValid({ name, passPercent, bands });
  await assertNameFree(schoolId, name, id);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.gradeBand.deleteMany({ where: { gradeScaleId: id } });
    return tx.gradeScale.update({
      where: { id },
      data: {
        name: String(name).trim(),
        passPercent: Number(passPercent),
        bands: { create: toBandRows(bands) },
      },
      include: withBands,
    });
  });

  ApiResponse.success(res, formatScale(updated), "Grade scale updated");
});

/**
 * @desc    Make a scale the school's default. New report cards and marks use it;
 *          existing report cards keep the scale they were generated with.
 * @route   PUT /api/v1/grade-scales/:id/default
 * @access  Private/Admin
 */
const setDefaultGradeScale = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id, 10);
  await findOwnScale(id, schoolId);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.gradeScale.updateMany({
      where: { schoolId, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
    return tx.gradeScale.update({
      where: { id },
      data: { isDefault: true },
      include: withBands,
    });
  });

  ApiResponse.success(res, formatScale(updated), "Default grade scale changed");
});

/**
 * @desc    Delete a scale. Refused for the default and for any scale in use.
 * @route   DELETE /api/v1/grade-scales/:id
 * @access  Private/Admin
 */
const deleteGradeScale = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const id = parseInt(req.params.id, 10);
  const existing = await findOwnScale(id, schoolId);

  if (existing.isDefault) {
    throw ApiError.badRequest(
      "This is the default scale. Make another scale the default first.",
    );
  }
  if (existing._count.reportCards > 0) {
    throw ApiError.conflict(
      `This scale was used for ${existing._count.reportCards} report card(s) and cannot be deleted.`,
    );
  }

  await prisma.gradeScale.delete({ where: { id } });
  ApiResponse.success(res, null, "Grade scale deleted");
});

module.exports = {
  listGradeScales,
  listPresets,
  createGradeScale,
  updateGradeScale,
  setDefaultGradeScale,
  deleteGradeScale,
};
