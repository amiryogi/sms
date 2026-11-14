const prisma = require("../config/database");
const { ApiResponse, asyncHandler } = require("../utils");

/** Phones kept per user; the least recently seen ones beyond this are dropped. */
const MAX_DEVICES_PER_USER = 10;

/**
 * @desc    Register this phone for push notifications (or refresh its registration)
 * @route   POST /api/v1/devices
 * @access  Private (any role; always for req.user)
 */
const registerDevice = asyncHandler(async (req, res) => {
  const { token, platform } = req.body;
  const owner = { userId: req.user.id, schoolId: req.user.schoolId, platform, lastSeenAt: new Date() };

  // One row per phone. A token that signs in as someone else moves to them: the
  // phone changed hands, and the previous user must stop getting pushes on it.
  const device = await prisma.deviceToken.upsert({
    where: { token },
    update: owner,
    create: { token, ...owner },
    select: { id: true, platform: true, lastSeenAt: true },
  });

  const mine = await prisma.deviceToken.findMany({
    where: { userId: req.user.id },
    select: { id: true },
    orderBy: [{ lastSeenAt: "desc" }, { id: "desc" }],
  });
  if (mine.length > MAX_DEVICES_PER_USER) {
    await prisma.deviceToken.deleteMany({ where: { id: { in: mine.slice(MAX_DEVICES_PER_USER).map((d) => d.id) } } });
  }

  return ApiResponse.success(res, device, "Device registered");
});

/**
 * @desc    Stop push notifications on this phone (the app calls it before signing out)
 * @route   DELETE /api/v1/devices/:token
 * @access  Private (only the caller's own registration)
 */
const unregisterDevice = asyncHandler(async (req, res) => {
  await prisma.deviceToken.deleteMany({ where: { token: req.params.token, userId: req.user.id } });
  return ApiResponse.noContent(res);
});

module.exports = { registerDevice, unregisterDevice, MAX_DEVICES_PER_USER };
