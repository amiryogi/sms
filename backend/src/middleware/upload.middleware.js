const multer = require('multer');
const fs = require('fs');
const { ApiError } = require('../utils');
const config = require('../config');

// Ensure upload directory exists for local storage
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// =====================================================
// FILE TYPE WHITELIST
// =====================================================
// The saved extension is derived from the (validated) MIME type, never from the
// client's file name: a file called "x.html" sent as image/png must be stored as
// .png so that /uploads never serves attacker-chosen HTML. Content is also
// checked against the type's magic bytes after the upload lands on disk.
const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt',
};

const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

const startsWith = (buf, bytes, offset = 0) =>
  buf.length >= offset + bytes.length &&
  bytes.every((b, i) => buf[offset + i] === b);

// Returns true when the file header matches the declared MIME type.
// text/plain has no signature; it is only rejected if it contains NUL bytes.
const MAGIC_CHECKS = {
  'image/jpeg': (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  'image/png': (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  'image/gif': (b) =>
    startsWith(b, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWith(b, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
  'image/webp': (b) =>
    startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  'application/pdf': (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]),
  'application/msword': (b) => startsWith(b, OLE_SIGNATURE),
  'application/vnd.ms-excel': (b) => startsWith(b, OLE_SIGNATURE),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (b) =>
    startsWith(b, ZIP_SIGNATURE),
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': (b) =>
    startsWith(b, ZIP_SIGNATURE),
  'text/plain': (b) => !b.includes(0x00),
};

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
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
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
      const ext = MIME_EXTENSIONS[file.mimetype];
      if (!ext) {
        return cb(new ApiError(400, 'Invalid file type.'));
      }
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const field = String(file.fieldname).replace(/[^a-zA-Z0-9_-]/g, '') || 'file';
      cb(null, field + '-' + uniqueSuffix + ext);
    },
  });
  console.log('✅ Local disk storage configured');
}

// File Filter
const fileFilter = (req, file, cb) => {
  if (Object.prototype.hasOwnProperty.call(MIME_EXTENSIONS, file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only images (JPG, PNG, GIF, WebP), PDF, Word, Excel, and Text files are allowed.'), false);
  }
};

const multerUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: (config.upload && config.upload.maxSize) || 5 * 1024 * 1024, // Default 5MB
  },
});

// Collect every file multer attached to the request.
const collectFiles = (req) => {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((list) => files.push(...list));
  }
  return files;
};

const removeLocalFiles = (files) => {
  files.forEach((file) => {
    if (file.path && !String(file.path).startsWith('http')) {
      fs.unlink(file.path, () => {});
    }
  });
};

const readHeader = (filePath, length = 16) =>
  new Promise((resolve, reject) => {
    fs.open(filePath, 'r', (openErr, fd) => {
      if (openErr) return reject(openErr);
      const buf = Buffer.alloc(length);
      fs.read(fd, buf, 0, length, 0, (readErr, bytesRead) => {
        fs.close(fd, () => {});
        if (readErr) return reject(readErr);
        resolve(buf.subarray(0, bytesRead));
      });
    });
  });

// Post-upload check: the bytes on disk must match the declared MIME type.
// Cloud-stored files (path is an http URL) are validated by Cloudinary's
// allowed_formats instead.
const verifyFileContents = async (req, res, next) => {
  const files = collectFiles(req);
  try {
    for (const file of files) {
      if (!file.path || String(file.path).startsWith('http')) continue;
      const check = MAGIC_CHECKS[file.mimetype];
      // text/plain: inspect a larger sample for NUL bytes
      const header = await readHeader(file.path, file.mimetype === 'text/plain' ? 4096 : 16);
      if (!check || !check(header)) {
        removeLocalFiles(files);
        return next(new ApiError(400, 'File content does not match its declared type.'));
      }
    }
    return next();
  } catch (err) {
    removeLocalFiles(files);
    return next(err);
  }
};

// Same interface as a multer instance (single / array / fields / none), but
// each returns [multerMiddleware, verifyFileContents] so content is checked.
// Express flattens middleware arrays, so call sites are unchanged.
const upload = {
  single: (name) => [multerUpload.single(name), verifyFileContents],
  array: (name, maxCount) => [multerUpload.array(name, maxCount), verifyFileContents],
  fields: (fields) => [multerUpload.fields(fields), verifyFileContents],
  none: () => multerUpload.none(),
};

module.exports = {
  upload,
  MIME_EXTENSIONS,
  cloudinary: cloudinary || {}, // Export empty object if cloudinary not loaded
};
