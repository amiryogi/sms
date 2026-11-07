const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const {
  validate,
  authenticate,
  isAdmin,
  loginLimiter,
  refreshLimiter,
} = require('../middleware');

// Validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  // Accounts are always created in the calling admin's school; any client
  // supplied schoolCode is ignored. Students and parents have their own
  // creation flows (POST /students, POST /admin/parents) because they need a
  // profile row, so they cannot be registered here.
  body('role')
    .isIn(['ADMIN', 'TEACHER', 'EXAM_OFFICER', 'ACCOUNTANT'])
    .withMessage('Role must be one of ADMIN, TEACHER, EXAM_OFFICER, ACCOUNTANT'),
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
];

// Routes
// Rate limiters run BEFORE the validators so a throttled request is rejected
// without paying for validation, a DB lookup or a bcrypt comparison.
router.post('/login', loginLimiter, loginValidation, validate, authController.login);
// Admin-only: creating accounts is never public.
router.post('/register', authenticate, isAdmin, registerValidation, validate, authController.register);
router.post(
  '/refresh-token',
  refreshLimiter,
  refreshTokenValidation,
  validate,
  authController.refreshToken
);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.put('/change-password', authenticate, changePasswordValidation, validate, authController.changePassword);

module.exports = router;
