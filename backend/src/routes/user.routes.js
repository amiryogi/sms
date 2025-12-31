const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { authenticate, isAdmin, isOwner, validate } = require('../middleware');
const { createUserRules, updateUserRules, updateRolesRules, listUsersRules, idParamRule } = require('../validators');

// All routes require authentication
router.use(authenticate);

// Get roles and permissions (Admin only)
router.get('/roles', isAdmin, userController.getRoles);
router.get('/permissions', isAdmin, userController.getPermissions);

// List users (Admin only)
router.get('/', isAdmin, listUsersRules, validate, userController.getUsers);

// Get single user (Admin or Owner)
router.get('/:id', [idParamRule], validate, isOwner, userController.getUser);

// Create user (Admin only)
router.post('/', isAdmin, createUserRules, validate, userController.createUser);

// Update user (Admin or Owner for basic fields)
router.put('/:id', [idParamRule, ...updateUserRules], validate, userController.updateUser);

// Update user roles (Admin only)
router.put('/:id/roles', isAdmin, [idParamRule, ...updateRolesRules], validate, userController.updateUserRoles);

// Delete user (Admin only)
router.delete('/:id', isAdmin, [idParamRule], validate, userController.deleteUser);

module.exports = router;
