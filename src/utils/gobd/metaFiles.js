// GoBD/IDEA Meta File Generator
// Generates index.xml and table/field descriptions

/**
 * Escapes XML special characters.
 * @param {unknown} value
 * @returns {string}
 */
function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates IDEA index.xml structure
 * @param {Object} params
 * @returns {string}
 */
function generateIndexXml({ tables }) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Index>\n${tables
    .map(
      (table) =>
        `<Table name="${escapeXml(table.name)}">\n${table.fields
          .map(
            (field) =>
              `<Field name="${escapeXml(field.name)}" type="${escapeXml(field.type)}">${escapeXml(
                field.description,
              )}</Field>`,
          )
          .join('\n')}\n</Table>`,
    )
    .join('\n')}\n</Index>`;
}

/**
 * Generates table/field description CSV
 * @param {Object} table
 * @returns {string}
 */
function generateTableDescriptionCsv(table) {
  return [
    'Field;Type;Description',
    ...table.fields.map((field) => `${field.name};${field.type};${field.description}`),
  ].join('\n');
}

module.exports = {
  generateIndexXml,
  generateTableDescriptionCsv,
};
