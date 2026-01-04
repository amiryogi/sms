const { ApiResponse, asyncHandler } = require("../utils");
const parentService = require("../services/parent.service");

// =====================================================
// ADMIN ENDPOINTS (for parentAdmin.routes.js)
// =====================================================

const createParent = asyncHandler(async (req, res) => {
  const parent = await parentService.createParent(req.user.schoolId, req.body);
  ApiResponse.created(res, parent, "Parent account created successfully");
});

const getParents = asyncHandler(async (req, res) => {
  const result = await parentService.listParents(req.user.schoolId, req.query);
  ApiResponse.paginated(res, result.parents, result.pagination);
});

const updateParent = asyncHandler(async (req, res) => {
  const parentId = parseInt(req.params.id, 10);
  const parent = await parentService.updateParent(
    req.user.schoolId,
    parentId,
    req.body
  );
  ApiResponse.success(res, parent, "Parent updated successfully");
});

const linkStudent = asyncHandler(async (req, res) => {
  const parentId = parseInt(req.params.id, 10);
  const parent = await parentService.linkStudent(
    req.user.schoolId,
    parentId,
    req.body
  );
  ApiResponse.success(res, parent, "Student linked successfully");
});

const unlinkStudent = asyncHandler(async (req, res) => {
  const parentId = parseInt(req.params.id, 10);
  const { studentId } = req.body;
  const parent = await parentService.unlinkStudent(
    req.user.schoolId,
    parentId,
    studentId
  );
  ApiResponse.success(res, parent, "Student unlinked successfully");
});

// =====================================================
// PARENT-FACING ENDPOINTS (for parent.routes.js)
// These are used by logged-in parents to view their own children
// =====================================================

/**
 * @desc    Get logged-in parent's linked children
 * @route   GET /api/v1/parents/me/children
 * @access  Private (PARENT only)
 *
 * SECURITY: This endpoint uses req.user.id (User.id) to find the parent,
 * NOT req.user.parentId. This ensures:
 * 1. Parent can only see their own children
 * 2. No ID manipulation can access other parents' data
 * 3. The join goes: User.id -> Parent.userId -> StudentParent -> Student
 */
const getMyChildren = asyncHandler(async (req, res) => {
  const children = await parentService.getMyChildren(
    req.user.id, // User.id from JWT, NOT parentId
    req.user.schoolId
  );

  ApiResponse.success(
    res,
    {
      children,
      count: children.length,
    },
    "Children retrieved successfully"
  );
});

/**
 * @desc    Get specific child by student ID
 * @route   GET /api/v1/parents/me/children/:studentId
 * @access  Private (PARENT only)
 *
 * SECURITY: Verifies the student is actually linked to this parent
 */
const getChildById = asyncHandler(async (req, res) => {
  const child = await parentService.getChildById(
    req.user.id,
    req.user.schoolId,
    req.params.studentId
  );

  ApiResponse.success(res, child, "Child details retrieved successfully");
});

module.exports = {
  // Admin endpoints
  createParent,
  getParents,
  updateParent,
  linkStudent,
  unlinkStudent,
  // Parent-facing endpoints
  getMyChildren,
  getChildById,
};
