
/**
 * @deprecated use `createSecureUploader` from `./secureUpload.js` instead.
 * This helper remains for legacy routes only and is intentionally not updated to
 * the hardened defaults.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

if (!global.__legacyUploadDeprecatedWarning) {
  global.__legacyUploadDeprecatedWarning = true;
  // eslint-disable-next-line no-console
  console.warn(
    'Deprecated middleware/upload.js loaded – switch any new routes to middleware/secureUpload.js',
  );
}

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const invoiceDir = path.join(uploadDir, 'invoices');
const tempDir = path.join(uploadDir, 'temp');

[uploadDir, invoiceDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, invoiceDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `invoice-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, JPG, PNG) and PDF files are allowed'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, 
  },
  fileFilter,
});

module.exports = upload;
