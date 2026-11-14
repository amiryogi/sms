const { body, param } = require("express-validator");
const { isExpoPushToken } = require("../services/push/expoPush");

/** POST /devices: an Expo push token and the phone's platform. */
const registerDeviceRules = [
  body("token").custom((value) => isExpoPushToken(value)).withMessage("token must be an Expo push token"),
  body("platform").isIn(["ios", "android"]).withMessage("platform must be ios or android"),
];

/** DELETE /devices/:token */
const deviceTokenParamRule = param("token")
  .custom((value) => isExpoPushToken(value))
  .withMessage("token must be an Expo push token");

module.exports = { registerDeviceRules, deviceTokenParamRule };
