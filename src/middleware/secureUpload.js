const fs = require('fs');
const path = require('path');
const multer = require('multer');
const logger = require('../lib/logger');

const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'secure'));
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const FILE_SIGNATURES = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpg: Buffer.from([0xff, 0xd8, 0xff]),
  tiffLittle: Buffer.from([0x49, 0x49, 0x2a, 0x00]),
  tiffBig: Buffer.from([0x4d, 0x4d, 0x00, 0x2a]),
};

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

const readFileHeader = (filePath, length = 16) => {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const bytesRead = fs.readSync(fd, buffer, 0, length, 0);
    return buffer.slice(0, bytesRead);
  } finally {
    fs.closeSync(fd);
  }
};

const isLikelyText = (buffer) => {
  for (const byte of buffer) {
    if (byte === 0x00) {
      return false;
    }
  }
  return true;
};

const detectFileSignature = (filePath) => {
  const header = readFileHeader(filePath, 16);

  if (header.slice(0, FILE_SIGNATURES.pdf.length).equals(FILE_SIGNATURES.pdf)) {
    return { type: 'pdf' };
  }
  if (header.slice(0, FILE_SIGNATURES.png.length).equals(FILE_SIGNATURES.png)) {
    return { type: 'png' };
  }
  if (header.slice(0, FILE_SIGNATURES.jpg.length).equals(FILE_SIGNATURES.jpg)) {
    return { type: 'jpg' };
  }
  if (
    header.slice(0, FILE_SIGNATURES.tiffLittle.length).equals(FILE_SIGNATURES.tiffLittle) ||
    header.slice(0, FILE_SIGNATURES.tiffBig.length).equals(FILE_SIGNATURES.tiffBig)
  ) {
    return { type: 'tiff' };
  }

  const textSample = readFileHeader(filePath, 4096);
  if (isLikelyText(textSample)) {
    const asString = textSample.toString('utf8').trim();
    if (asString.startsWith('<')) {
      return { type: 'xml' };
    }
    return { type: 'text' };
  }

  return { type: 'unknown' };
};

const validateUploadedFile = (filePath, allowedKinds = []) => {
  const detected = detectFileSignature(filePath);
  const allowed = new Set(allowedKinds);
  if (allowed.has(detected.type)) {
    return { valid: true, detected: detected.type };
  }
  return {
    valid: false,
    detected: detected.type,
    reason: `Detected ${detected.type} but expected ${[...allowed].join(', ')}`,
  };
};

const logUploadMetadata = (req, res, next) => {
  res.on('finish', () => {
    if (!req.file) {
      return;
    }
    const { filename, mimetype, size, path: storedPath, originalname } = req.file;
    logger.info('Upload metadata', {
      userId: req.user?.id || null,
      companyId: req.companyId || null,
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
  validateUploadedFile,
};
