const fs = require('fs');
const os = require('os');
const path = require('path');
const ocrService = require('../../src/services/ocrService');

const writeTempFile = (name, contents) => {
  const filePath = path.join(os.tmpdir(), `${name}-${Date.now()}`);
  fs.writeFileSync(filePath, contents);
  return filePath;
};

describe('ocrService validateDocument', () => {
  it('rejects files larger than 50MB', async () => {
    const filePath = writeTempFile('large.pdf', '%PDF-1.4\n');
    fs.truncateSync(filePath, 51 * 1024 * 1024);

    const result = await ocrService.validateDocument(filePath);
    fs.unlinkSync(filePath);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/File too large/i);
  });
});
