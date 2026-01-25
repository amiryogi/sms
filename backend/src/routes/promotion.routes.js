const express = require('express');
const router = express.Router();

const promotionController = require('../controllers/promotion.controller');
const { authenticate, isAdmin, validate } = require('../middleware');
const {
  processPromotionRules,
  bulkPromotionRules,
  eligibleStudentsQueryRules,
  promotionHistoryQueryRules,
} = require('../validators');
const { idParamRule, paginationRules } = require('../validators/common.validators');

// All routes require authentication and admin access
router.use(authenticate);
router.use(isAdmin);

// Get promotion history with filters
router.get(
  '/',
  [...promotionHistoryQueryRules, ...paginationRules],
  validate,
  promotionController.getPromotionHistory
);

// Get promotion statistics
router.get('/stats', promotionController.getPromotionStats);

// Get eligible students for promotion
router.get(
  '/eligible',
  eligibleStudentsQueryRules,
  validate,
  promotionController.getEligibleStudents
);

// Process single promotion
router.post(
  '/',
  processPromotionRules,
  validate,
  promotionController.processPromotion
);

// Bulk promote students
router.post(
  '/bulk',
  bulkPromotionRules,
  validate,
  promotionController.bulkPromote
);

// Undo/Delete a promotion
router.delete(
  '/:id',
  [idParamRule],
  validate,
  promotionController.undoPromotion
);

module.exports = router;
