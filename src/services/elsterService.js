
const axios = require('axios');
const xml2js = require('xml2js');
const crypto = require('crypto');
const logger = require('../lib/logger');

class ElsterService {
  constructor() {
    this.baseURL = process.env.ELSTER_URL || 'https://www.elster.de/elsterweb/api';
    this.certificatePath = process.env.ELSTER_CERTIFICATE_PATH;
    this.apiVersion = '2024';
    this.testMode = process.env.NODE_ENV !== 'production';
  }

  // Authenticate with ELSTER
  async authenticate(taxNumber, certificateData) {
    try {
      const authData = {
        tax_number: taxNumber,
        certificate: certificateData,
        timestamp: new Date().toISOString(),
        api_version: this.apiVersion,
      };

      const response = await axios.post(`${this.baseURL}/auth`, authData, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SmartAccounting/1.0',
        },
        timeout: 30000,
      });

      if (response.data.success) {
        logger.info('ELSTER authentication successful');
        return {
          success: true,
          sessionToken: response.data.session_token,
          validUntil: response.data.valid_until,
        };
      }

      throw new Error('ELSTER authentication failed');
    } catch (error) {
      logger.error('ELSTER authentication error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Submit VAT advance return (Umsatzsteuervoranmeldung)
  async submitUStVA(vatData, sessionToken) {
    try {
      const xmlData = this.generateUStVAXML(vatData);
      
      const submission = {
        document_type: 'UStVA',
        period: vatData.period,
        xml_data: xmlData,
        session_token: sessionToken,
        test_mode: this.testMode,
      };

      const response = await axios.post(`${this.baseURL}/submit/ustva`, submission, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        timeout: 60000,
      });

      if (response.data.success) {
        logger.info(`UStVA submitted successfully: ${response.data.submission_id}`);
        return {
          success: true,
          submissionId: response.data.submission_id,
          transferNumber: response.data.transfer_number,
          status: 'submitted',
        };
      }

      throw new Error('UStVA submission failed');
    } catch (error) {
      logger.error('UStVA submission error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Submit annual tax return
  async submitAnnualReturn(taxData, sessionToken) {
    try {
      const xmlData = this.generateAnnualReturnXML(taxData);
      
      const submission = {
        document_type: 'ESt',
        year: taxData.year,
        xml_data: xmlData,
        session_token: sessionToken,
        test_mode: this.testMode,
      };

      const response = await axios.post(`${this.baseURL}/submit/annual`, submission, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        timeout: 120000,
      });

      return {
        success: response.data.success,
        submissionId: response.data.submission_id,
        status: response.data.status,
      };
    } catch (error) {
      logger.error('Annual return submission error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check submission status
  async checkSubmissionStatus(submissionId, sessionToken) {
    try {
      const response = await axios.get(`${this.baseURL}/status/${submissionId}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      return {
        success: true,
        status: response.data.status,
        messages: response.data.messages || [],
        lastUpdated: response.data.last_updated,
      };
    } catch (error) {
      logger.error('Status check error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Generate UStVA XML according to ELSTER schema
  generateUStVAXML(vatData) {
    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
    });

    const xmlObject = {
      'Elster': {
        '$': {
          'xmlns': 'http://www.elster.de/2002/XMLSchema',
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xsi:schemaLocation': 'http://www.elster.de/2002/XMLSchema UStVA_2024.xsd',
        },
        'TransferHeader': {
          'Verfahren': 'UStVA',
          'DatenArt': 'UStVA',
          'Vorgang': 'send-NoSig',
          'Testmerker': this.testMode ? 1 : 0,
          'HerstellerID': '12345',
          'DatenLieferant': vatData.companyName || 'SmartAccounting',
          'Datei': {
            'Verschluesselung': 'PKCS#7v1.5',
            'Kompression': 'GZIP',
            'DatenGroesse': '1024',
          },
        },
        'DatenTeil': {
          'Nutzdatenblock': {
            'NutzdatenHeader': {
              'NutzdatenTicket': crypto.randomUUID(),
              'Empfaenger': {
                'id': 'F',
              },
            },
            'Nutzdaten': {
              'Anmeldungssteuern': {
                'DatenLieferant': {
                  'Name': vatData.companyName,
                  'Strasse': vatData.address?.street,
                  'PLZ': vatData.address?.postalCode,
                  'Ort': vatData.address?.city,
                },
                'Erstellungsdatum': new Date().toISOString().split('T')[0],
                'Steuerfall': {
                  'Umsatzsteuervoranmeldung': {
                    'Jahr': vatData.year,
                    'Zeitraum': vatData.quarter,
                    'Steuernummer': vatData.taxNumber,
                    'Kz41': vatData.outputVAT?.standardRate || 0,
                    'Kz81': vatData.outputVAT?.reducedRate || 0,
                    'Kz66': vatData.inputVAT?.total || 0,
                    'Kz83': Math.max(0, (vatData.outputVAT?.total || 0) - (vatData.inputVAT?.total || 0)),
                  },
                },
              },
            },
          },
        },
      },
    };

    return builder.buildObject(xmlObject);
  }

  generateAnnualReturnXML(taxData) {
    // Implementation for annual tax return XML generation
    // This would be more complex and company-specific
    return `<?xml version="1.0" encoding="UTF-8"?>
<AnnualReturn year="${taxData.year}">
  <CompanyData>
    <Name>${taxData.companyName}</Name>
    <TaxNumber>${taxData.taxNumber}</TaxNumber>
  </CompanyData>
  <FinancialData>
    <Revenue>${taxData.revenue}</Revenue>
    <Expenses>${taxData.expenses}</Expenses>
    <Profit>${taxData.profit}</Profit>
  </FinancialData>
</AnnualReturn>`;
  }

  // Test ELSTER connection
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/status`, {
        timeout: 10000,
      });

      return {
        success: true,
        status: response.data?.status || 'connected',
        apiVersion: this.apiVersion,
        testMode: this.testMode,
      };
    } catch (error) {
      logger.error('ELSTER connection test failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get tax deadlines from ELSTER
  async getTaxDeadlines(year) {
    try {
      const response = await axios.get(`${this.baseURL}/deadlines/${year}`);
      
      return {
        success: true,
        deadlines: response.data.deadlines,
      };
    } catch (error) {
      logger.error('Failed to fetch tax deadlines:', error);
      return {
        success: false,
        error: error.message,
        fallbackDeadlines: this.getDefaultDeadlines(year),
      };
    }
  }

  getDefaultDeadlines(year) {
    return [
      { date: `${year}-01-10`, type: 'UStVA', description: 'VAT advance return December' },
      { date: `${year}-02-10`, type: 'UStVA', description: 'VAT advance return January' },
      { date: `${year}-03-10`, type: 'UStVA', description: 'VAT advance return February' },
      { date: `${year}-05-31`, type: 'ESt', description: 'Income tax return' },
      { date: `${year}-07-31`, type: 'GewSt', description: 'Trade tax return' },
    ];
  }
}

module.exports = new ElsterService();
