const noticeService = require("../services/notice.service");
const { ApiResponse, asyncHandler } = require("../utils");

/**
 * @desc    Get all notices (role-aware filtering)
 * @route   GET /api/v1/notices
 * @access  Private (All authenticated users)
 *
 * Query params:
 *   - status: DRAFT | PUBLISHED | ARCHIVED (admin only for DRAFT/ARCHIVED)
 *   - priority: low | normal | high | urgent
 *   - search: text search in title/content
 *   - createdById: filter by creator (admin only)
 *   - page, limit: pagination
 */
const getNotices = asyncHandler(async (req, res) => {
  // User context from JWT - schoolId and roles already attached by auth middleware
  const result = await noticeService.listNotices(req.user, req.query);

  ApiResponse.paginated(
    res,
    result.data,
    result.pagination,
    "Notices retrieved successfully"
  );
});

/**
 * @desc    Get single notice by ID
 * @route   GET /api/v1/notices/:id
 * @access  Private (visibility based on role and targeting)
 */
const getNotice = asyncHandler(async (req, res) => {
  const notice = await noticeService.getNoticeById(req.user, req.params.id);

  ApiResponse.success(res, notice);
});

/**
 * @desc    Create a new notice
 * @route   POST /api/v1/notices
 * @access  Private (ADMIN, TEACHER - with restrictions)
 *
 * Body:
 *   - title: string (required)
 *   - content: string (required)
 *   - targetType: GLOBAL | ROLE_SPECIFIC | CLASS_SPECIFIC
 *   - priority: low | normal | high | urgent
 *   - publishFrom: datetime (optional)
 *   - publishTo: datetime (optional)
 *   - roleTargets: number[] (role IDs, for ROLE_SPECIFIC)
 *   - classTargets: { classId, sectionId? }[] (for CLASS_SPECIFIC)
 *
 * Notes:
 *   - schoolId derived from req.user.schoolId (NEVER from body)
 *   - createdById derived from req.user.id (NEVER from body)
 *   - Teachers can only use CLASS_SPECIFIC with their assigned classes
 */
const createNotice = asyncHandler(async (req, res) => {
  // Extract only allowed fields - never trust schoolId/createdById from body
  const {
    title,
    content,
    targetType,
    priority,
    publishFrom,
    publishTo,
    roleTargets,
    classTargets,
  } = req.body;

  const notice = await noticeService.createNotice(req.user, {
    title,
    content,
    targetType,
    priority,
    publishFrom,
    publishTo,
    roleTargets,
    classTargets,
  });

  ApiResponse.created(res, notice, "Notice created successfully");
});

/**
 * @desc    Update a notice
 * @route   PUT /api/v1/notices/:id
 * @access  Private (Owner or ADMIN, DRAFT only)
 *
 * Body: Same as create (partial updates allowed)
 */
const updateNotice = asyncHandler(async (req, res) => {
  const {
    title,
    content,
    targetType,
    priority,
    publishFrom,
    publishTo,
    roleTargets,
    classTargets,
  } = req.body;

  const notice = await noticeService.updateNotice(req.user, req.params.id, {
    title,
    content,
    targetType,
    priority,
    publishFrom,
    publishTo,
    roleTargets,
    classTargets,
  });

  ApiResponse.success(res, notice, "Notice updated successfully");
});

/**
 * @desc    Delete a notice
 * @route   DELETE /api/v1/notices/:id
 * @access  Private (Owner or ADMIN, DRAFT only)
 */
const deleteNotice = asyncHandler(async (req, res) => {
  const result = await noticeService.deleteNotice(req.user, req.params.id);

  ApiResponse.success(res, null, result.message);
});

/**
 * @desc    Publish a notice (DRAFT → PUBLISHED)
 * @route   PATCH /api/v1/notices/:id/publish
 * @access  Private (Owner or ADMIN)
 */
const publishNotice = asyncHandler(async (req, res) => {
  const notice = await noticeService.publishNotice(req.user, req.params.id);

  ApiResponse.success(res, notice, "Notice published successfully");
});

/**
 * @desc    Archive a notice (PUBLISHED → ARCHIVED)
 * @route   PATCH /api/v1/notices/:id/archive
 * @access  Private (Owner or ADMIN)
 */
const archiveNotice = asyncHandler(async (req, res) => {
  const notice = await noticeService.archiveNotice(req.user, req.params.id);

  ApiResponse.success(res, notice, "Notice archived successfully");
});

module.exports = {
  getNotices,
  getNotice,
  createNotice,
  updateNotice,
  deleteNotice,
  publishNotice,
  archiveNotice,
};
