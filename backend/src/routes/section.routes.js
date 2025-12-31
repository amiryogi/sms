const express = require('express');
const router = express.Router();

const sectionController = require('../controllers/section.controller');
const { authenticate, isAdmin, validate } = require('../middleware');
const { sectionRules, idParamRule } = require('../validators');

router.use(authenticate);

router.get('/', sectionController.getSections);
router.get('/:id', [idParamRule], validate, sectionController.getSection);

router.post('/', isAdmin, sectionRules, validate, sectionController.createSection);
router.put('/:id', isAdmin, [idParamRule, ...sectionRules], validate, sectionController.updateSection);
router.delete('/:id', isAdmin, [idParamRule], validate, sectionController.deleteSection);

module.exports = router;
