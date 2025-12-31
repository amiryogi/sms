const express = require('express');
const router = express.Router();

const classSubjectController = require('../controllers/classSubject.controller');
const { authenticate, isAdmin, validate } = require('../middleware');
const { classSubjectRules, idParamRule } = require('../validators');

router.use(authenticate);

router.get('/', classSubjectController.getClassSubjects);

router.post('/', isAdmin, classSubjectRules, validate, classSubjectController.assignSubjectToClass);
router.put('/:id', isAdmin, [idParamRule, ...classSubjectRules], validate, classSubjectController.updateClassSubject);
router.delete('/:id', isAdmin, [idParamRule], validate, classSubjectController.removeSubjectFromClass);

module.exports = router;
