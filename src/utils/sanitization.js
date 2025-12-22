
const createDOMPurify = require('isomorphic-dompurify');

const DOMPurify = createDOMPurify();

const sanitizeHtml = (dirty) => {
  if (typeof dirty !== 'string') {
    return dirty;
  }
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') 
    .replace(/javascript:/gi, '') 
    .replace(/on\w+\s*=/gi, ''); 
};

const sanitizeFilename = (filename) => {
  if (typeof filename !== 'string') {
    return 'unknown';
  }
  
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') 
    .replace(/\.{2,}/g, '.') 
    .replace(/^\.+|\.+$/g, '') 
    .toLowerCase();
};

module.exports = {
  sanitizeHtml,
  sanitizeInput,
  sanitizeFilename,
};
