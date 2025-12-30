/* eslint-disable no-useless-escape */
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { FileAttachment } = require('../models');
const { checkTableAndColumns } = require('./guards/schemaGuard');
const { Op } = require('sequelize');
const gobdService = require('./gobdComplianceService');
const logger = require('../lib/logger');

const DOCUMENT_TYPE_LABELS = {
  receipt: 'Receipt',
  invoice: 'Invoice',
  bank_statement: 'Bank statement',
  tax_document: 'Tax document',
  generic: 'Document',
};

class OCRService {
  constructor() {
    this.supportedLanguages = ['deu', 'eng']; // German and English
    this.supportedFormats = ['pdf', 'jpg', 'jpeg', 'png', 'tiff'];
    this.archivePath = path.join(process.cwd(), 'uploads', 'documents', 'archive');
    this.tempPath = path.join(process.cwd(), 'temp', 'ocr');

    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.archivePath, this.tempPath].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Process uploaded document with OCR
  async processDocument(filePath, options = {}) {
    // Guard: check FileAttachment OCR columns
    const ocrSchemaOk = await checkTableAndColumns('file_attachments', [
      'ocrText',
      'ocrConfidence',
      'extractedData',
      'processingStatus',
      'archived',
      'retentionPeriod',
    ]);
    if (!ocrSchemaOk) {
      return { success: false, error: 'OCR schema missing or incomplete' };
    }
    try {
      const { language = 'deu+eng', documentType = 'receipt', userId, companyId } = options;

      // Validate file
      const validation = await this.validateDocument(filePath);
      if (!validation.valid) {
        throw new Error(`Invalid document: ${validation.error}`);
      }

      // Preprocess image for better OCR accuracy
      const preprocessedPath = await this.preprocessImage(filePath);

      // Perform OCR
      const ocrResult = await this.extractText(preprocessedPath, language);

      // Extract structured data based on document type
      const structuredData = await this.extractStructuredData(ocrResult.text, documentType);

      // Archive document with GoBD compliance
      const archiveResult = await this.archiveDocument(filePath, {
        originalName: path.basename(filePath),
        documentType,
        userId,
        companyId,
        ocrText: ocrResult.text,
        extractedData: structuredData,
      });

      // Create audit log
      await gobdService.createImmutableRecord(
        'document_processed',
        {
          documentId: archiveResult.id,
          documentType,
          extractedData: structuredData,
          confidence: ocrResult.confidence,
        },
        userId || 'system',
        'document',
      );

      // Cleanup temp files
      await this.cleanup([preprocessedPath]);

      return {
        success: true,
        documentId: archiveResult.id,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        extractedData: structuredData,
        archiveLocation: archiveResult.archivePath,
      };
    } catch (error) {
      logger.error('OCR processing error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async previewDocument(filePath, options = {}) {
    const { documentType = 'receipt', language = 'deu+eng' } = options;
    try {
      const validation = await this.validateDocument(filePath);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const preprocessedPath = await this.preprocessImage(filePath);
      const ocrResult = await this.extractText(preprocessedPath, language);
      const structuredData = await this.extractStructuredData(ocrResult.text, documentType);
      const warnings = this.buildPreviewWarnings(structuredData);
      const explanations = this.buildPreviewExplanations(structuredData, documentType);

      await this.cleanup([preprocessedPath]);

      return {
        success: true,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        extractedData: structuredData,
        warnings,
        explanations,
      };
    } catch (error) {
      logger.error('OCR preview error:', error);
      return { success: false, error: error.message };
    }
  }

  // Validate document format and content
  async validateDocument(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: 'File does not exist' };
      }

      const stats = fs.statSync(filePath);
      if (stats.size > 50 * 1024 * 1024) {
        // 50MB limit
        return { valid: false, error: 'File too large (max 50MB)' };
      }

      const ext = path.extname(filePath).toLowerCase().slice(1);
      if (!this.supportedFormats.includes(ext)) {
        return { valid: false, error: `Unsupported format: ${ext}` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Preprocess image for better OCR accuracy
  async preprocessImage(filePath) {
    try {
      const processedPath = path.join(this.tempPath, `processed_${Date.now()}.png`);

      await sharp(filePath)
        .resize(2000, null, { withoutEnlargement: true })
        .normalize()
        .sharpen()
        .png({ quality: 95 })
        .toFile(processedPath);

      return processedPath;
    } catch (error) {
      logger.error('Image preprocessing error:', error);
      return filePath; // Return original if preprocessing fails
    }
  }

  // Extract text using Tesseract OCR
  async extractText(imagePath, language) {
    try {
      const result = await Tesseract.recognize(imagePath, language, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.info(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        words: result.data.words?.length || 0,
      };
    } catch (error) {
      logger.error('Tesseract OCR error:', error);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  // Extract structured data based on document type
  async extractStructuredData(text, documentType) {
    const extractors = {
      receipt: this.extractReceiptData,
      invoice: this.extractInvoiceData,
      bank_statement: this.extractBankStatementData,
      tax_document: this.extractTaxDocumentData,
    };

    const extractor = extractors[documentType] || this.extractGenericData;
    return extractor.call(this, text);
  }

  buildPreviewWarnings(structuredData = {}) {
    const warnings = [];
    const hasAmount =
      !!structuredData.amount ||
      !!structuredData.totalAmount ||
      !!structuredData.openingBalance ||
      !!structuredData.closingBalance;
    if (!hasAmount) {
      warnings.push('No convincing monetary total could be identified.');
    }

    const hasDate =
      !!structuredData.date ||
      !!structuredData.period ||
      !!structuredData.dueDate ||
      !!structuredData.taxYear;
    if (!hasDate) {
      warnings.push('Unable to detect a clear posting date or period.');
    }

    const hasIdentifier =
      !!structuredData.vendor ||
      !!structuredData.accountNumber ||
      !!structuredData.taxNumber ||
      !!structuredData.invoiceNumber;
    if (!hasIdentifier) {
      warnings.push('Key identifiers (vendor, account or invoice number) are missing.');
    }

    if (structuredData.type === 'generic') {
      warnings.push('Document could not be classified into a known document type.');
    }

    return warnings;
  }

  buildPreviewExplanations(structuredData = {}, documentType) {
    const explanations = [];
    const classification = structuredData.type || documentType || 'document';
    const label = DOCUMENT_TYPE_LABELS[classification] || classification;
    explanations.push(`Document heuristics treat this as a “${label}”.`);

    if (structuredData.vendor) {
      explanations.push('Vendor name comes from the first readable lines on the page.');
    }
    if (structuredData.amount || structuredData.totalAmount) {
      explanations.push(
        'Amounts are extracted via keywords such as “Summe”, “Total”, or currency symbols.',
      );
    }
    if (structuredData.date) {
      explanations.push('Dates are matched with German/ISO date patterns.');
    }
    if (!structuredData.amount && !structuredData.vendor) {
      explanations.push('OCR text is captured but critical fields need manual review.');
    }

    explanations.push('Confidence is aggregated from the underlying OCR engine.');
    return explanations;
  }

  // Extract receipt/invoice data with German patterns
  extractReceiptData(text) {
    const data = {
      type: 'receipt',
      date: null,
      amount: null,
      vatAmount: null,
      vendor: null,
      items: [],
    };

    // German date patterns
    const datePatterns = [
      /(\d{1,2})\.(\d{1,2})\.(\d{4})/,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.date = match[0];
        break;
      }
    }

    // German amount patterns
    const amountPatterns = [
      /(?:Summe|Gesamt|Total|Betrag)[\s:]*(\d+[,\.]\d{2})\s*€?/i,
      /(\d+[,\.]\d{2})\s*EUR?/i,
      /€\s*(\d+[,\.]\d{2})/i,
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.amount = parseFloat(match[1].replace(',', '.'));
        break;
      }
    }

    // VAT patterns
    const vatPatterns = [
      /(?:MwSt|USt|VAT)[\s:]*(\d+[,\.]\d{2})/i,
      /19%[\s:]*(\d+[,\.]\d{2})/i,
      /7%[\s:]*(\d+[,\.]\d{2})/i,
    ];

    for (const pattern of vatPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.vatAmount = parseFloat(match[1].replace(',', '.'));
        break;
      }
    }

    // Extract vendor name (usually in first few lines)
    const lines = text.split('\n').slice(0, 5);
    for (const line of lines) {
      if (line.trim().length > 3 && !line.match(/\d{2}\.\d{2}\.\d{4}/)) {
        data.vendor = line.trim();
        break;
      }
    }

    return data;
  }

  extractInvoiceData(text) {
    return {
      type: 'invoice',
      invoiceNumber: this.extractPattern(text, /(?:Rechnung|Invoice|RG)[\s#:]*([A-Z0-9-]+)/i),
      date: this.extractPattern(text, /(\d{1,2}\.(\d{1,2})\.(\d{4}))/),
      dueDate: this.extractPattern(
        text,
        /(?:Fällig|Due|Zahlbar bis)[\s:]*(\d{1,2}\.\d{1,2}\.\d{4})/i,
      ),
      totalAmount: this.extractAmount(
        text,
        /(?:Gesamtbetrag|Total|Endbetrag)[\s:]*(\d+[,\.]\d{2})/i,
      ),
      netAmount: this.extractAmount(text, /(?:Nettobetrag|Net)[\s:]*(\d+[,\.]\d{2})/i),
      vatAmount: this.extractAmount(text, /(?:MwSt|USt|VAT)[\s:]*(\d+[,\.]\d{2})/i),
    };
  }

  extractBankStatementData(text) {
    return {
      type: 'bank_statement',
      accountNumber: this.extractPattern(text, /(?:Konto|Account)[\s:]*([0-9\s]+)/i),
      period: this.extractPattern(
        text,
        /(\d{1,2}\.\d{1,2}\.\d{4})\s*-\s*(\d{1,2}\.\d{1,2}\.\d{4})/,
      ),
      openingBalance: this.extractAmount(text, /(?:Anfangssaldo|Opening)[\s:]*(\d+[,\.]\d{2})/i),
      closingBalance: this.extractAmount(text, /(?:Endsaldo|Closing)[\s:]*(\d+[,\.]\d{2})/i),
    };
  }

  extractTaxDocumentData(text) {
    return {
      type: 'tax_document',
      taxYear: this.extractPattern(text, /(?:Steuerjahr|Tax Year)[\s:]*(\d{4})/i),
      taxNumber: this.extractPattern(text, /(?:Steuernummer|Tax ID)[\s:]*([0-9\/]+)/i),
      assessment: this.extractAmount(text, /(?:Festsetzung|Assessment)[\s:]*(\d+[,\.]\d{2})/i),
    };
  }

  extractGenericData(text) {
    return {
      type: 'generic',
      extractedText: text.substring(0, 500), // First 500 characters
      wordCount: text.split(/\s+/).length,
      hasNumbers: /\d/.test(text),
      hasAmounts: /\d+[,\.]\d{2}/.test(text),
    };
  }

  // Helper methods
  extractPattern(text, pattern) {
    const match = text.match(pattern);
    return match ? match[1] : null;
  }

  extractAmount(text, pattern) {
    const match = text.match(pattern);
    return match ? parseFloat(match[1].replace(',', '.')) : null;
  }

  // Archive document with GoBD compliance
  async archiveDocument(filePath, metadata) {
    try {
      const fileHash = await this.calculateFileHash(filePath);
      const timestamp = new Date().toISOString();
      const archiveFileName = `${timestamp.replace(/[:.]/g, '-')}_${fileHash.substring(0, 8)}_${metadata.originalName}`;
      const archivePath = path.join(this.archivePath, archiveFileName);

      // Copy file to archive
      fs.copyFileSync(filePath, archivePath);

      // Create database record
      const fileRecord = await FileAttachment.create({
        originalName: metadata.originalName,
        fileName: archiveFileName,
        filePath: archivePath,
        fileSize: fs.statSync(archivePath).size,
        mimeType: this.getMimeType(metadata.originalName),
        fileHash,
        documentType: metadata.documentType,
        userId: metadata.userId,
        companyId: metadata.companyId,
        ocrText: metadata.ocrText,
        extractedData: JSON.stringify(metadata.extractedData),
        archived: true,
        retentionPeriod: 10, // 10 years for GoBD compliance
      });

      return {
        id: fileRecord.id,
        archivePath,
        hash: fileHash,
      };
    } catch (error) {
      logger.error('Document archiving error:', error);
      throw new Error(`Archiving failed: ${error.message}`);
    }
  }

  async calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.tiff': 'image/tiff',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  // Cleanup temporary files
  async cleanup(filePaths) {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        logger.warn(`Failed to cleanup file ${filePath}:`, error.message);
      }
    }
  }

  // Search archived documents
  async searchDocuments(criteria) {
    try {
      const { documentType, dateFrom, dateTo, vendor, minAmount, maxAmount } = criteria;

      const whereClause = {};
      if (criteria.companyId) {
        whereClause.companyId = criteria.companyId;
      }
      if (documentType) {
        whereClause.documentType = documentType;
      }
      if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) {
          whereClause.createdAt[Op.gte] = dateFrom;
        }
        if (dateTo) {
          whereClause.createdAt[Op.lte] = dateTo;
        }
      }

      const documents = await FileAttachment.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
      });

      // Filter by extracted data if needed
      if (vendor || minAmount || maxAmount) {
        return documents.filter((doc) => {
          const data = JSON.parse(doc.extractedData || '{}');

          if (vendor && !data.vendor?.toLowerCase().includes(vendor.toLowerCase())) {
            return false;
          }

          if (minAmount && (!data.amount || data.amount < minAmount)) {
            return false;
          }

          if (maxAmount && (!data.amount || data.amount > maxAmount)) {
            return false;
          }

          return true;
        });
      }

      return documents;
    } catch (error) {
      logger.error('Document search error:', error);
      throw error;
    }
  }

  // Validate document integrity
  async validateDocumentIntegrity(documentId) {
    try {
      const document = await FileAttachment.findByPk(documentId);
      if (!document) {
        return { valid: false, error: 'Document not found' };
      }

      if (!fs.existsSync(document.filePath)) {
        return { valid: false, error: 'Archive file missing' };
      }

      const currentHash = await this.calculateFileHash(document.filePath);
      if (currentHash !== document.fileHash) {
        return { valid: false, error: 'File integrity compromised' };
      }

      return { valid: true, message: 'Document integrity verified' };
    } catch (error) {
      logger.error('Document validation error:', error);
      return { valid: false, error: error.message };
    }
  }
}

const ocrService = new OCRService();
ocrService.runOCRPreview = ocrService.previewDocument.bind(ocrService);
module.exports = ocrService;
/* eslint-enable no-useless-escape */
