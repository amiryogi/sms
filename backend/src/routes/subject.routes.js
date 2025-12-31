const express = require('express');
const router = express.Router();

const subjectController = require('../controllers/subject.controller');
const { authenticate, isAdmin, validate } = require('../middleware');
const { subjectRules, idParamRule } = require('../validators');

router.use(authenticate);

router.get('/', subjectController.getSubjects);
router.get('/:id', [idParamRule], validate, subjectController.getSubject);

router.post('/', isAdmin, subjectRules, validate, subjectController.createSubject);
router.put('/:id', isAdmin, [idParamRule, ...subjectRules], validate, subjectController.updateSubject);
router.delete('/:id', isAdmin, [idParamRule], validate, subjectController.deleteSubject);

module.exports = router;
