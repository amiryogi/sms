const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/device.controller");
const { authenticate } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { registerDeviceRules, deviceTokenParamRule } = require("../validators/device.validators");

/**
 * Push-notification devices. Any signed-in user, and only ever their own
 * phone: the user and school come from the access token, never from the request.
 */
router.post("/", authenticate, registerDeviceRules, validate, deviceController.registerDevice);
router.delete("/:token", authenticate, deviceTokenParamRule, validate, deviceController.unregisterDevice);

module.exports = router;
