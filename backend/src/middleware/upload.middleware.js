const multer = require('multer');
const fs = require('fs');
const ApiError = require('../utils/ApiError');
const config = require('../config');

// =====================================================
// FILE TYPE WHITELIST
// =====================================================
// The saved extension is derived from the (validated) MIME type, never from the
// client's file name: a file called "x.html" sent as image/png must be stored as
// .png so that /uploads never serves attacker-chosen HTML. Content is also
// checked against the type's magic bytes before the file is kept anywhere.
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

/** True when `header` (the first bytes of the file) matches `mimetype`. */
const contentMatchesType = (mimetype, header) => {
  const check = MAGIC_CHECKS[mimetype];
  return Boolean(check && check(header));
};
const headerLength = (mimetype) => (mimetype === 'text/plain' ? 4096 : 16);

// =====================================================
// STORAGE MODE
// =====================================================
//   cloudinary  CLOUDINARY_CLOUD_NAME is set: files are held in memory,
//               content-checked, then uploaded; file.path becomes the URL.
//   disk        local ./uploads (served at /uploads), content-checked on disk.
//   none        a read-only host (Vercel) without Cloudinary: requests that
//               carry files get 503; everything else works.
const READ_ONLY_HOST = Boolean(process.env.VERCEL);
const UPLOAD_DIR = 'uploads';

let cloudinary = null;
if (config.cloudinary && config.cloudinary.cloudName) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
}
const MODE = cloudinary ? 'cloudinary' : READ_ONLY_HOST ? 'none' : 'disk';

const newFileName = (file) => {
  const field = String(file.fieldname).replace(/[^a-zA-Z0-9_-]/g, '') || 'file';
  return `${field}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
};

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Created on first use, not at startup, so a read-only filesystem can't
    // crash the app.
    fs.mkdir(UPLOAD_DIR, { recursive: true }, (err) =>
      cb(err ? new ApiError(503, 'File uploads are not available on this server.') : null, `${UPLOAD_DIR}/`)
    );
  },
  filename: (req, file, cb) => {
    const ext = MIME_EXTENSIONS[file.mimetype];
    if (!ext) return cb(new ApiError(400, 'Invalid file type.'));
    cb(null, newFileName(file) + ext);
  },
});

const fileFilter = (req, file, cb) => {
  if (Object.prototype.hasOwnProperty.call(MIME_EXTENSIONS, file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Invalid file type. Only images (JPG, PNG, GIF, WebP), PDF, Word, Excel, and Text files are allowed.'), false);
  }
};

const multerUpload = multer({
  storage: MODE === 'disk' ? diskStorage : multer.memoryStorage(),
  fileFilter,
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

// Office documents and text go to Cloudinary as "raw" files (kept byte for
// byte, extension in the id); images and PDFs as "image" (viewable inline).
const RAW_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

const uploadToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const ext = MIME_EXTENSIONS[file.mimetype];
    const raw = RAW_TYPES.has(file.mimetype);
    const name = newFileName(file);
    const field = String(file.fieldname).replace(/[^a-zA-Z0-9_-]/g, '') || 'file';
    const options = {
      folder: `sms/${field}`,
      resource_type: raw ? 'raw' : 'image',
      public_id: raw ? `${name}${ext}` : name,
      overwrite: false,
      ...(raw ? {} : { format: ext.slice(1) }),
    };
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => (err ? reject(err) : resolve(result)));
    stream.end(file.buffer);
  });

// After multer: every file's content must match its declared type, then it is
// kept (disk) or uploaded (Cloudinary). Nothing is stored if any file fails.
const verifyAndStore = async (req, res, next) => {
  const files = collectFiles(req);
  if (files.length === 0) return next();

  if (MODE === 'none') {
    return next(new ApiError(503, 'File uploads are not configured on this server.'));
  }

  try {
    for (const file of files) {
      const header = file.buffer
        ? file.buffer.subarray(0, headerLength(file.mimetype))
        : await readHeader(file.path, headerLength(file.mimetype));
      if (!contentMatchesType(file.mimetype, header)) {
        removeLocalFiles(files);
        return next(new ApiError(400, 'File content does not match its declared type.'));
      }
    }
  } catch (err) {
    removeLocalFiles(files);
    return next(err);
  }

  if (MODE !== 'cloudinary') return next();

  try {
    for (const file of files) {
      const result = await uploadToCloudinary(file);
      file.path = result.secure_url;
      file.filename = RAW_TYPES.has(file.mimetype) ? result.public_id : `${result.public_id}${MIME_EXTENSIONS[file.mimetype]}`;
      delete file.buffer;
    }
    return next();
  } catch (err) {
    console.error('Cloudinary upload failed:', err && err.message);
    return next(new ApiError(502, 'The file could not be stored. Please try again.'));
  }
};

// Same interface as a multer instance (single / array / fields / none), but
// each returns [multerMiddleware, verifyAndStore] so content is checked and
// stored. Express flattens middleware arrays, so call sites are unchanged.
const upload = {
  single: (name) => [multerUpload.single(name), verifyAndStore],
  array: (name, maxCount) => [multerUpload.array(name, maxCount), verifyAndStore],
  fields: (fields) => [multerUpload.fields(fields), verifyAndStore],
  none: () => multerUpload.none(),
};

module.exports = {
  upload,
  MIME_EXTENSIONS,
  STORAGE_MODE: MODE,
  contentMatchesType,
  cloudinary: cloudinary || {}, // Export empty object if cloudinary not loaded
};
