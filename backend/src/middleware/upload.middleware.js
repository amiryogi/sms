const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ApiError } = require('../utils');
const config = require('../config');

// Ensure upload directory exists for local storage
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Strategy
let storage;
let cloudinary;

try {
  // Only attempt to load cloudinary if configured
  if (config.cloudinary && config.cloudinary.cloudName) {
    cloudinary = require('cloudinary').v2;
    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });

    storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'sms/assignments',
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
        resource_type: 'auto',
      },
    });
    console.log('✅ Cloudinary storage configured');
  }
} catch (error) {
  console.warn('⚠️ Cloudinary configuration failed, falling back to local storage:', error.message);
}

// Fallback to local storage
if (!storage) {
  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  });
  console.log('✅ Local disk storage configured');
}

// File Filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only images, PDF, Word, Excel, and Text files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: (config.upload && config.upload.maxSize) || 5 * 1024 * 1024, // Default 5MB
  },
});

module.exports = {
  upload,
  cloudinary: cloudinary || {}, // Export empty object if cloudinary not loaded
};
