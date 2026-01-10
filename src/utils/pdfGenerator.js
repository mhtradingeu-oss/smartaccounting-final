const escapePdfText = (value) =>
  String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const buildPdfTextStream = (lines = []) => {
  const fontSize = 11;
  const startX = 48;
  const startY = 800;
  const lineHeight = 14;
  const textLines = Array.isArray(lines) ? lines : [String(lines)];

  const chunks = ['BT', `/F1 ${fontSize} Tf`, `1 0 0 1 ${startX} ${startY} Tm`];
  textLines.forEach((line, index) => {
    if (index > 0) {
      chunks.push(`0 -${lineHeight} Td`);
    }
    chunks.push(`(${escapePdfText(line)}) Tj`);
  });
  chunks.push('ET');
  return chunks.join('\n');
};

const generateSimplePdf = (lines = []) => {
  const header = '%PDF-1.4\n';
  const content = buildPdfTextStream(lines);
  const objects = [];

  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  objects.push(
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
  );
  objects.push('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');
  objects.push(
    `5 0 obj << /Length ${Buffer.byteLength(content, 'utf8')} >> stream\n${content}\nendstream\nendobj`,
  );

  let body = '';
  const offsets = [0];
  let position = header.length;
  body += header;

  objects.forEach((object) => {
    offsets.push(position);
    body += `${object}\n`;
    position = body.length;
  });

  const xrefStart = body.length;
  body += `xref\n0 ${offsets.length}\n`;
  body += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  body += `trailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(body, 'utf8');
};

module.exports = {
  generateSimplePdf,
};
