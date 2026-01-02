const express = require("express");
const router = express.Router();

const { uploadAvatar } = require("../controllers/upload.controller");
const { authenticate } = require("../middleware");
const { upload } = require("../middleware/upload.middleware");

// Upload avatar (image only)
router.post("/avatar", authenticate, upload.single("avatar"), uploadAvatar);

module.exports = router;
