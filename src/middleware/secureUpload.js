const fs = require('fs');
const path = require('path');
const multer = require('multer');
const logger = require('../lib/logger');

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'secure'));
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o750 });
  }
};

const sanitizeFilename = (value) => {
  const base = path.basename(value || 'file');
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return cleaned || 'file';
};

const createSecureUploader = ({
  subDir = '',
  allowedMimeTypes = [],
  allowedExtensions = [],
  maxSize = DEFAULT_MAX_FILE_SIZE,
} = {}) => {
  const destination = path.join(UPLOAD_ROOT, subDir);
  ensureDir(destination);

  const lowercaseMimeTypes = new Set(allowedMimeTypes.map((mime) => mime.toLowerCase()));
  const lowercaseExtensions = new Set(allowedExtensions.map((ext) => ext.toLowerCase()));

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const timestamp = Date.now();
      const uniqueSuffix = Math.round(Math.random() * 1e9);
      const safeName = sanitizeFilename(file.originalname);
      const finalName = `${safeName}-${timestamp}-${uniqueSuffix}${ext}`;
      logger.info('Upload stored', {
        field: file.fieldname,
        originalName: file.originalname,
        storedName: finalName,
        mimetype: file.mimetype,
        targetDir: subDir || 'root',
      });
      cb(null, finalName);
    },
  });

  const fileFilter = (req, file, cb) => {
    const mimetype = (file.mimetype || '').toLowerCase();
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeAllowed = !allowedMimeTypes.length || lowercaseMimeTypes.has(mimetype);
    const extAllowed = !allowedExtensions.length || lowercaseExtensions.has(ext);
    if (mimeAllowed && extAllowed) {
      return cb(null, true);
    }
    logger.warn('Upload rejected', {
      field: file.fieldname,
      originalName: file.originalname,
      mimetype,
      extension: ext,
    });
    return cb(new Error('Unsupported file type'));
  };

  return multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter,
  });
};

const logUploadMetadata = (req, res, next) => {
  res.on('finish', () => {
    if (!req.file) {
      return;
    }
    const { filename, mimetype, size, path: storedPath, originalname } = req.file;
    logger.info('Upload metadata', {
      userId: req.user?.id || null,
      companyId: req.user?.companyId || null,
      fieldname: req.file.fieldname,
      originalName: originalname,
      storedName: filename,
      mimetype,
      size,
      storedPath,
      route: req.originalUrl,
    });
  });
  next();
};

module.exports = {
  createSecureUploader,
  logUploadMetadata,
};
