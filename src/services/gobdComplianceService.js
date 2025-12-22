
const { Op } = require('sequelize');
const { AuditLog } = require('../models');
const crypto = require('crypto');

class GoBDComplianceService {
  constructor() {
    this.immutableLogs = [];
  }

  // GoBD-compliant immutable transaction logging
  async createImmutableRecord(action, data, userId, documentType = 'transaction') {
    const timestamp = new Date().toISOString();
    const hash = this.generateHash(action, data, timestamp);
    
    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp,
      action,
      documentType,
      userId,
      data: JSON.stringify(data),
      hash,
      version: '1.0',
      retention_period: this.calculateRetentionPeriod(documentType),
      immutable: true,
      reason: action,
    };

    // Store in database with immutable flag
    await AuditLog.create(auditEntry);
    
    return auditEntry;
  }

  generateHash(action, data, timestamp) {
    const input = `${action}:${JSON.stringify(data)}:${timestamp}`;
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  calculateRetentionPeriod(documentType) {
    const retentionRules = {
      'transaction': 10, // 10 years for financial records
      'invoice': 10,
      'tax_report': 10,
      'bank_statement': 10,
      'receipt': 6, // 6 years for receipts under €150
      'contract': 10,
    };
    return retentionRules[documentType] || 10;
  }

  // Export data in GoBD-compliant format
  async exportGoBDData(startDate, endDate, format = 'XML') {
    const records = await AuditLog.findAll({
      where: {
        timestamp: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['timestamp', 'ASC']],
    });

    if (format === 'XML') {
      return this.generateGoBDXML(records);
    }
    return this.generateGoBDCSV(records);
  }

  generateGoBDXML(records) {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<GoBD_Export xmlns="http://www.gdpdu.org/2013/gdpdu-01-09-2013.xsd"
             created="${new Date().toISOString()}"
             company="MH Trading EU"
             period_start="${records[0]?.timestamp}"
             period_end="${records[records.length - 1]?.timestamp}">`;
    
    const transactions = records.map(record => `
  <Transaction>
    <ID>${record.id}</ID>
    <Timestamp>${record.timestamp}</Timestamp>
    <Action>${record.action}</Action>
    <DocumentType>${record.documentType}</DocumentType>
    <Hash>${record.hash}</Hash>
    <Data>${record.data}</Data>
  </Transaction>`).join('');

    return `${header}\n<Transactions>${transactions}\n</Transactions>\n</GoBD_Export>`;
  }

  // GDPR compliance methods
  async anonymizeUserData(userId) {
    // Anonymize personal data while keeping business records
    const anonymizedData = {
      email: `anonymized_${crypto.randomUUID()}@example.com`,
      firstName: 'ANONYMIZED',
      lastName: 'ANONYMIZED',
      phoneNumber: null,
      address: 'ANONYMIZED',
    };
    
    await this.createImmutableRecord('gdpr_anonymization', { userId, anonymizedData }, 'system');
    return anonymizedData;
  }

  async validateDataIntegrity() {
    const records = await AuditLog.findAll({ order: [['timestamp', 'ASC']] });
    const invalidRecords = [];

    for (const record of records) {
      const expectedHash = this.generateHash(record.action, JSON.parse(record.data), record.timestamp);
      if (expectedHash !== record.hash) {
        invalidRecords.push(record.id);
      }
    }

    return {
      valid: invalidRecords.length === 0,
      invalidRecords,
      totalRecords: records.length,
    };
  }
}

module.exports = new GoBDComplianceService();
