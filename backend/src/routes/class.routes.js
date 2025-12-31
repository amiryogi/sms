const express = require('express');
const router = express.Router();

const classController = require('../controllers/class.controller');
const { authenticate, isAdmin, validate } = require('../middleware');
const { classRules, idParamRule } = require('../validators');

router.use(authenticate);

router.get('/', classController.getClasses);
router.get('/:id', [idParamRule], validate, classController.getClass);

router.post('/', isAdmin, classRules, validate, classController.createClass);
router.put('/:id', isAdmin, [idParamRule, ...classRules], validate, classController.updateClass);
router.delete('/:id', isAdmin, [idParamRule], validate, classController.deleteClass);

module.exports = router;
