const { body } = require("express-validator");

/**
 * School settings validation rules
 * Note: All optional fields allow empty strings (which means "clear the field")
 */

// Helper to skip validation for empty strings
const skipIfEmpty = (value) => !value || value.trim() === "";

// Update school settings validation
const updateSchoolRules = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ max: 255 })
    .withMessage("Name must be less than 255 characters"),

  body("address")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Address must be less than 1000 characters"),

  body("phone")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage("Phone must be less than 20 characters"),

  body("email")
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (skipIfEmpty(value)) return true;
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error("Email must be a valid email address");
      }
      return true;
    })
    .isLength({ max: 255 })
    .withMessage("Email must be less than 255 characters"),

  body("tagline")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Tagline must be less than 500 characters"),

  body("website")
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (skipIfEmpty(value)) return true;
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error(
          "Website must be a valid URL (e.g., https://example.com)",
        );
      }
    })
    .isLength({ max: 255 })
    .withMessage("Website must be less than 255 characters"),

  body("landlineNumber")
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (skipIfEmpty(value)) return true;
      // More flexible Nepal landline pattern
      // Accepts: 01-4123456, 014123456, +977-1-4123456, 977-1-4123456, etc.
      const landlineRegex =
        /^(\+?977[-\s]?)?0?[1-9][0-9]{0,2}[-\s]?[0-9]{5,8}$/;
      if (!landlineRegex.test(value.replace(/\s/g, ""))) {
        throw new Error(
          "Landline must be a valid Nepal number (e.g., 01-4123456, +977-1-4123456)",
        );
      }
      return true;
    })
    .isLength({ max: 30 })
    .withMessage("Landline must be less than 30 characters"),

  body("facebookUrl")
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (skipIfEmpty(value)) return true;
      try {
        const url = new URL(value);
        if (
          !url.hostname.includes("facebook.com") &&
          !url.hostname.includes("fb.com")
        ) {
          throw new Error();
        }
        return true;
      } catch {
        throw new Error(
          "Please enter a valid Facebook URL (e.g., https://facebook.com/yourpage)",
        );
      }
    })
    .isLength({ max: 500 })
    .withMessage("Facebook URL must be less than 500 characters"),

  body("instagramUrl")
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (skipIfEmpty(value)) return true;
      try {
        const url = new URL(value);
        if (!url.hostname.includes("instagram.com")) {
          throw new Error();
        }
        return true;
      } catch {
        throw new Error(
          "Please enter a valid Instagram URL (e.g., https://instagram.com/yourpage)",
        );
      }
    })
    .isLength({ max: 500 })
    .withMessage("Instagram URL must be less than 500 characters"),

  body("youtubeUrl")
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (skipIfEmpty(value)) return true;
      try {
        const url = new URL(value);
        if (
          !url.hostname.includes("youtube.com") &&
          !url.hostname.includes("youtu.be")
        ) {
          throw new Error();
        }
        return true;
      } catch {
        throw new Error(
          "Please enter a valid YouTube URL (e.g., https://youtube.com/@yourchannel)",
        );
      }
    })
    .isLength({ max: 500 })
    .withMessage("YouTube URL must be less than 500 characters"),

  body("principalName")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage("Principal name must be less than 255 characters"),

  body("establishedYear")
    .optional({ nullable: true })
    .custom((value) => {
      if (value === "" || value === null || value === undefined) return true;
      const year = parseInt(value, 10);
      if (isNaN(year) || year < 1800 || year > new Date().getFullYear()) {
        throw new Error(
          `Established year must be between 1800 and ${new Date().getFullYear()}`,
        );
      }
      return true;
    }),
];

module.exports = {
  updateSchoolRules,
};
