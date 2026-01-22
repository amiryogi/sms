const prisma = require("../config/database");
const { ApiResponse, ApiError, asyncHandler } = require("../utils");
const fs = require("fs");
const path = require("path");

/**
 * @desc    Get current user's school settings
 * @route   GET /api/v1/school
 * @access  Private (All authenticated users)
 */
const getMySchool = asyncHandler(async (req, res) => {
  const school = await prisma.school.findUnique({
    where: { id: req.user.schoolId },
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      phone: true,
      email: true,
      logoUrl: true,
      tagline: true,
      website: true,
      bannerUrl: true,
      landlineNumber: true,
      facebookUrl: true,
      instagramUrl: true,
      youtubeUrl: true,
      principalName: true,
      establishedYear: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!school) {
    throw ApiError.notFound("School not found");
  }

  ApiResponse.success(res, school, "School retrieved successfully");
});

/**
 * @desc    Update current user's school settings
 * @route   PUT /api/v1/school
 * @access  Private (ADMIN only)
 */
const updateMySchool = asyncHandler(async (req, res) => {
  const {
    name,
    address,
    phone,
    email,
    tagline,
    website,
    landlineNumber,
    facebookUrl,
    instagramUrl,
    youtubeUrl,
    principalName,
    establishedYear,
  } = req.body;

  // Build update data - only include provided fields
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (address !== undefined) updateData.address = address || null;
  if (phone !== undefined) updateData.phone = phone || null;
  if (email !== undefined) updateData.email = email || null;
  if (tagline !== undefined) updateData.tagline = tagline || null;
  if (website !== undefined) updateData.website = website || null;
  if (landlineNumber !== undefined)
    updateData.landlineNumber = landlineNumber || null;
  if (facebookUrl !== undefined) updateData.facebookUrl = facebookUrl || null;
  if (instagramUrl !== undefined)
    updateData.instagramUrl = instagramUrl || null;
  if (youtubeUrl !== undefined) updateData.youtubeUrl = youtubeUrl || null;
  if (principalName !== undefined)
    updateData.principalName = principalName || null;
  if (establishedYear !== undefined)
    updateData.establishedYear = establishedYear
      ? parseInt(establishedYear)
      : null;

  const school = await prisma.school.update({
    where: { id: req.user.schoolId },
    data: updateData,
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      phone: true,
      email: true,
      logoUrl: true,
      tagline: true,
      website: true,
      bannerUrl: true,
      landlineNumber: true,
      facebookUrl: true,
      instagramUrl: true,
      youtubeUrl: true,
      principalName: true,
      establishedYear: true,
      isActive: true,
      updatedAt: true,
    },
  });

  ApiResponse.success(res, school, "School settings updated successfully");
});

/**
 * @desc    Upload school logo
 * @route   POST /api/v1/school/logo
 * @access  Private (ADMIN only)
 */
const uploadLogo = asyncHandler(async (req, res) => {
  const file = req.file;

  if (!file) {
    throw ApiError.badRequest("No file uploaded");
  }

  // Enforce images only for logo
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    // Cleanup local file if stored on disk
    if (file.path && !file.path.startsWith("http")) {
      fs.unlink(file.path, () => {});
    }
    throw ApiError.badRequest("Only image uploads are allowed for logo");
  }

  // Resolve file URL
  let logoUrl;
  if (file.path && file.path.startsWith("http")) {
    logoUrl = file.path;
  } else if (file.filename) {
    logoUrl = `uploads/${file.filename}`;
  } else {
    logoUrl = file.path;
  }

  if (!logoUrl) {
    throw ApiError.internal("Unable to resolve uploaded file URL");
  }

  // Get current school to delete old logo if exists
  const currentSchool = await prisma.school.findUnique({
    where: { id: req.user.schoolId },
    select: { logoUrl: true },
  });

  // Delete old logo file if it's local
  if (currentSchool?.logoUrl && !currentSchool.logoUrl.startsWith("http")) {
    const oldPath = path.join(process.cwd(), currentSchool.logoUrl);
    fs.unlink(oldPath, () => {}); // Ignore errors
  }

  // Update school with new logo
  const school = await prisma.school.update({
    where: { id: req.user.schoolId },
    data: { logoUrl },
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  });

  ApiResponse.success(res, school, "School logo uploaded successfully");
});

/**
 * @desc    Upload school banner
 * @route   POST /api/v1/school/banner
 * @access  Private (ADMIN only)
 */
const uploadBanner = asyncHandler(async (req, res) => {
  const file = req.file;

  if (!file) {
    throw ApiError.badRequest("No file uploaded");
  }

  // Enforce images only for banner
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    // Cleanup local file if stored on disk
    if (file.path && !file.path.startsWith("http")) {
      fs.unlink(file.path, () => {});
    }
    throw ApiError.badRequest("Only image uploads are allowed for banner");
  }

  // Resolve file URL
  let bannerUrl;
  if (file.path && file.path.startsWith("http")) {
    bannerUrl = file.path;
  } else if (file.filename) {
    bannerUrl = `uploads/${file.filename}`;
  } else {
    bannerUrl = file.path;
  }

  if (!bannerUrl) {
    throw ApiError.internal("Unable to resolve uploaded file URL");
  }

  // Get current school to delete old banner if exists
  const currentSchool = await prisma.school.findUnique({
    where: { id: req.user.schoolId },
    select: { bannerUrl: true },
  });

  // Delete old banner file if it's local
  if (currentSchool?.bannerUrl && !currentSchool.bannerUrl.startsWith("http")) {
    const oldPath = path.join(process.cwd(), currentSchool.bannerUrl);
    fs.unlink(oldPath, () => {}); // Ignore errors
  }

  // Update school with new banner
  const school = await prisma.school.update({
    where: { id: req.user.schoolId },
    data: { bannerUrl },
    select: {
      id: true,
      name: true,
      bannerUrl: true,
    },
  });

  ApiResponse.success(res, school, "School banner uploaded successfully");
});

/**
 * @desc    Get public school info by code (for login page)
 * @route   GET /api/v1/public/school/:code
 * @access  Public (No authentication required)
 */
const getPublicSchoolByCode = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const school = await prisma.school.findUnique({
    where: { code },
    select: {
      // Only expose non-sensitive branding info
      name: true,
      code: true,
      address: true,
      phone: true,
      email: true,
      logoUrl: true,
      tagline: true,
      website: true,
      bannerUrl: true,
      landlineNumber: true,
      facebookUrl: true,
      instagramUrl: true,
      youtubeUrl: true,
      establishedYear: true,
      isActive: true,
    },
  });

  if (!school || !school.isActive) {
    throw ApiError.notFound("School not found");
  }

  ApiResponse.success(res, school, "School info retrieved successfully");
});

module.exports = {
  getMySchool,
  updateMySchool,
  uploadLogo,
  uploadBanner,
  getPublicSchoolByCode,
};
