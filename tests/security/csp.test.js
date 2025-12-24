const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Frontend CSP compatibility', () => {
  const distDir = path.resolve(__dirname, '../../client/dist');
  const buildCommand = 'npm run build --prefix client';

  beforeAll(() => {
    execSync(buildCommand, { stdio: 'inherit' });
  });

  afterAll(() => {
    fs.rmSync(distDir, { recursive: true, force: true });
  });

  it('builds assets that load from the same origin and avoid inline scripts', () => {
    const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    const scriptSrcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
    expect(scriptSrcs.length).toBeGreaterThan(0);
    scriptSrcs.forEach((src) => {
      expect(src).toMatch(/^\/|\./);
      expect(src).not.toMatch(/^https?:\/\//);
    });

    const inlineScripts = html.match(
      /<script\b(?=[^>]*>)(?![^>]*\bsrc\b)[^>]*>[\s\S]*?<\/script>/gi,
    );
    expect(inlineScripts).toBeNull();

    const linkHrefs = [...html.matchAll(/<link\b[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
    linkHrefs.forEach((href) => {
      expect(href).toMatch(/^\/|\./);
      expect(href).not.toMatch(/^https?:\/\//);
    });
  });
});
