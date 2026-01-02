const fs = require("fs");
const { ApiResponse, ApiError, asyncHandler } = require("../utils");

// Normalize file URL for local vs cloud storage
const resolveFileUrl = (file) => {
  if (!file) return null;
  if (file.path && file.path.startsWith("http")) return file.path;
  if (file.filename) return `uploads/${file.filename}`;
  return file.path || null;
};

// POST /api/v1/uploads/avatar
const uploadAvatar = asyncHandler(async (req, res) => {
  const file = req.file;

  if (!file) {
    throw ApiError.badRequest("No file uploaded");
  }

  // Enforce images only for avatars
  if (!file.mimetype || !file.mimetype.startsWith("image/")) {
    // Cleanup local file if stored on disk
    if (file.path && !file.path.startsWith("http")) {
      fs.unlink(file.path, () => {});
    }
    throw ApiError.badRequest("Only image uploads are allowed for avatars");
  }

  const url = resolveFileUrl(file);

  if (!url) {
    throw ApiError.internal("Unable to resolve uploaded file URL");
  }

  ApiResponse.success(res, { url }, "Avatar uploaded successfully");
});

module.exports = {
  uploadAvatar,
};
