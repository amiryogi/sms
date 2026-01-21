const express = require('express');
const router = express.Router();
const multer = require('multer');

const subjectImportController = require('../controllers/subjectImport.controller');
const { authenticate, isAdmin } = require('../middleware');

// Configure multer for file upload (in-memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  },
});

// All routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);

// Preview import (dry run)
router.post('/preview', upload.single('file'), subjectImportController.previewImport);

// Actual import
router.post('/', upload.single('file'), subjectImportController.importSubjects);

module.exports = router;
