// ELSTER / UStVA Export Service (Phase 6)
// Exports VAT returns in ELSTER-compatible XML format
const xmlbuilder = require('xmlbuilder');

class ElsterExportService {
  async exportUStVA({ vatSummary, companyInfo }) {
    // Build minimal ELSTER XML structure
    const xml = xmlbuilder
      .create('UStVA')
      .ele('Company')
      .ele('Name', companyInfo.name)
      .up()
      .ele('TaxId', companyInfo.taxId)
      .up()
      .up()
      .ele('VATSummary')
      .ele('TotalVAT', vatSummary.totalVAT)
      .up()
      .ele('TaxableSales', vatSummary.taxableSales)
      .up()
      .ele('TaxFreeSales', vatSummary.taxFreeSales)
      .up()
      .end({ pretty: true });
    return xml;
  }
}

module.exports = new ElsterExportService();
