const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateUploadedFile } = require('../../src/middleware/secureUpload');

const writeTempFile = (name, contents) => {
  const filePath = path.join(os.tmpdir(), `${name}-${Date.now()}`);
  fs.writeFileSync(filePath, contents);
  return filePath;
};

describe('secureUpload validateUploadedFile', () => {
  it('accepts PDF signatures', () => {
    const filePath = writeTempFile('mock.pdf', '%PDF-1.4\n%Mock\n');
    const result = validateUploadedFile(filePath, ['pdf']);
    fs.unlinkSync(filePath);
    expect(result.valid).toBe(true);
    expect(result.detected).toBe('pdf');
  });

  it('accepts text payloads as text', () => {
    const filePath = writeTempFile('mock.csv', 'Date,Amount\n2025-01-01,10.00\n');
    const result = validateUploadedFile(filePath, ['text']);
    fs.unlinkSync(filePath);
    expect(result.valid).toBe(true);
    expect(result.detected).toBe('text');
  });

  it('rejects mismatched signatures (pdf content but text expected)', () => {
    const filePath = writeTempFile('polyglot.csv', '%PDF-1.4\n%Fake\n');
    const result = validateUploadedFile(filePath, ['text']);
    fs.unlinkSync(filePath);
    expect(result.valid).toBe(false);
    expect(result.detected).toBe('pdf');
  });
});
