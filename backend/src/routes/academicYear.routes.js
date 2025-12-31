const express = require('express');
const router = express.Router();

const academicYearController = require('../controllers/academicYear.controller');
const { authenticate, isAdmin, validate } = require('../middleware');
const { academicYearRules, idParamRule } = require('../validators');

router.use(authenticate);

router.get('/', academicYearController.getAcademicYears);
router.get('/current', academicYearController.getCurrentAcademicYear);

router.post('/', isAdmin, academicYearRules, validate, academicYearController.createAcademicYear);
router.put('/:id', isAdmin, [idParamRule, ...academicYearRules], validate, academicYearController.updateAcademicYear);
router.delete('/:id', isAdmin, [idParamRule], validate, academicYearController.deleteAcademicYear);

module.exports = router;
