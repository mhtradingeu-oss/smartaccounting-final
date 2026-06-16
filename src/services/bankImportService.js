// Bank Import Service (Phase 7.1)
// Read-only import logic for CAMT.053, MT940, OCR fallback

class BankImportService {
  async importCAMT053(xmlString) {
    // TODO: Use camt053Parser to parse XML
    // Return array of BankTransaction objects
    return [];
  }

  async importMT940(mt940String) {
    // TODO: Use mt940Parser to parse SWIFT
    // Return array of BankTransaction objects
    return [];
  }

  async importOCR(pdfBuffer) {
    // TODO: Use ocrStatementParser to extract data
    // Return array of BankTransaction objects
    return [];
  }
}

module.exports = new BankImportService();
