const crypto = require('crypto');
const { Op } = require('sequelize');
const csv = require('csv-parser');
const fs = require('fs');
const moment = require('moment');
const AuditLogService = require('../services/auditLogService');
const ocrService = require('./ocrService');
const { analyzeDocument } = require('./documentAnalysisService');
const {
  AuditLog,
  BankStatement,
  BankTransaction,
  Transaction,
  BankStatementImportDryRun,
  Invoice,
  Expense,
  User,
  FileAttachment,
  sequelize,
} = require('../models');
const path = require('path');

const DRY_RUN_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
};

class BankStatementService {
  async getDryRunById({ dryRunId, companyId, transaction }) {
    return BankStatementImportDryRun.findOne({
      where: { id: dryRunId, companyId },
      transaction,
    });
  }
  constructor() {
    this.supportedFormats = ['CSV', 'MT940', 'CAMT053', 'OCR'];
  }

  formatPeriod(startDate, endDate) {
    if (!startDate || !endDate) {
      return null;
    }
    const start = moment(startDate).format('DD.MM.YYYY');
    const end = moment(endDate).format('DD.MM.YYYY');
    return `${start} - ${end}`;
  }

  buildStatementExtractedData({ bankStatement, extractedData = {} }) {
    const normalized = extractedData && typeof extractedData === 'object' ? { ...extractedData } : {};
    const period =
      normalized.period ||
      this.formatPeriod(bankStatement.statementPeriodStart, bankStatement.statementPeriodEnd);

    return {
      ...normalized,
      accountNumber: normalized.accountNumber || bankStatement.accountNumber || 'UNKNOWN',
      period,
      openingBalance:
        normalized.openingBalance ?? bankStatement.openingBalance ?? null,
      closingBalance:
        normalized.closingBalance ?? bankStatement.closingBalance ?? null,
    };
  }

  buildExtractedDataFromTransactions(transactions = []) {
    if (!transactions.length) {
      return {
        accountNumber: 'UNKNOWN',
        period: null,
        openingBalance: null,
        closingBalance: null,
      };
    }
    const period = this.formatPeriod(this.getEarliestDate(transactions), this.getLatestDate(transactions));
    const openingBalance = transactions[0]?.runningBalance ?? null;
    const closingBalance = transactions[transactions.length - 1]?.runningBalance ?? null;
    return {
      accountNumber: 'UNKNOWN',
      period,
      openingBalance,
      closingBalance,
    };
  }

  async updateFileAttachmentAnalysis({
    documentId,
    filePath,
    companyId,
    analysis,
    extractedData,
  }) {
    let fileRecord = null;
    if (documentId) {
      fileRecord = await FileAttachment.findByPk(documentId);
    } else if (filePath && companyId) {
      fileRecord = await FileAttachment.findOne({
        where: { filePath, companyId, documentType: 'bank_statement' },
      });
    }
    if (!fileRecord) {
      return null;
    }
    const existingData =
      typeof fileRecord.extractedData === 'string'
        ? JSON.parse(fileRecord.extractedData || '{}')
        : fileRecord.extractedData || {};
    await fileRecord.update({
      processingStatus: analysis?.compliance?.status || fileRecord.processingStatus,
      extractedData: {
        ...existingData,
        ...extractedData,
        analysis,
      },
    });
    return fileRecord;
  }

  async loadTransactionsFromFile(filePath, format) {
    const normalizedFormat = (format || '').toString().toUpperCase();
    switch (normalizedFormat) {
      case 'CSV':
        return this.parseCSVFile(filePath);
      case 'MT940':
        return this.parseMT940File(filePath);
      case 'CAMT053':
        return this.parseCAMT053File(filePath);
      case 'OCR':
        return [];
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  async importBankStatement(companyId, filePath, fileName, format, context = {}) {
    try {
      return await this._runBankStatementImport({
        companyId,
        filePath,
        fileName,
        format,
        context,
      });
    } catch (error) {
      throw new Error(`Failed to import bank statement: ${error.message}`);
    }
  }

  async _runBankStatementImport({ companyId, filePath, fileName, format, context, transaction }) {
    let bankStatement = null;
    let fileAttachmentId = null;
    let ocrDocumentId = null;
    try {
      const normalizedFormat = (format || '').toString().toUpperCase();
      const isOcrImport = normalizedFormat === 'OCR';
      if (!isOcrImport) {
        const mimeLookup = {
          CSV: 'text/csv',
          MT940: 'text/plain',
          CAMT053: 'application/xml',
        };
        const fileAttachment = await FileAttachment.create(
          {
            fileName: path.basename(filePath),
            originalName: fileName,
            filePath,
            fileSize: fs.statSync(filePath).size,
            mimeType: mimeLookup[normalizedFormat] || 'application/octet-stream',
            documentType: 'bank_statement',
            userId: context?.userId || null,
            companyId,
            uploadedBy: context?.userId || null,
            processingStatus: 'processed',
          },
          transaction ? { transaction } : {},
        );
        fileAttachmentId = fileAttachment?.id || null;
      }
      bankStatement = await BankStatement.create(
        {
          companyId,
          userId: context?.userId || null,
          fileName,
          fileFormat: normalizedFormat,
          filePath,
          accountNumber: 'TEMP',
          statementPeriodStart: new Date(),
          statementPeriodEnd: new Date(),
          statementDate: new Date(),
          openingBalance: 0,
          closingBalance: 0,
          status: isOcrImport ? 'NEEDS_REVIEW' : 'PROCESSING',
        },
        { transaction },
      );

      let transactions = [];
      let processedTransactions = [];
      let extractedData = null;
      let ocrWarnings = [];
      let ocrConfidence = null;
      let ocrText = null;

      if (isOcrImport) {
        const ocrResult = await ocrService.processDocument(filePath, {
          documentType: 'bank_statement',
          userId: context?.userId,
          companyId,
        });
        if (!ocrResult.success) {
          throw new Error(ocrResult.error || 'OCR processing failed');
        }
        ocrDocumentId = ocrResult.documentId;
        extractedData = ocrResult.extractedData || null;
        ocrText = ocrResult.text || null;
        ocrConfidence = ocrResult.confidence || null;
        const preview = await ocrService.previewDocument(filePath, {
          documentType: 'bank_statement',
        });
        ocrWarnings = preview?.warnings || [];
      } else {
        transactions = await this.loadTransactionsFromFile(filePath, normalizedFormat);
        processedTransactions = await this.processTransactions(
          companyId,
          bankStatement.id,
          transactions,
          { transaction },
        );
      }

      const hasTransactions = transactions.length > 0;
      await bankStatement.update(
        {
          totalTransactions: transactions.length,
          processedTransactions: processedTransactions.length,
          status: isOcrImport ? 'NEEDS_REVIEW' : 'COMPLETED',
          accountNumber: transactions[0]?.accountNumber || extractedData?.accountNumber || 'UNKNOWN',
          statementPeriodStart: hasTransactions
            ? this.getEarliestDate(transactions)
            : this.parsePeriodStart(extractedData?.period),
          statementPeriodEnd: hasTransactions
            ? this.getLatestDate(transactions)
            : this.parsePeriodEnd(extractedData?.period),
          statementDate: hasTransactions
            ? this.getLatestDate(transactions)
            : this.parsePeriodEnd(extractedData?.period) || new Date(),
          openingBalance: transactions[0]?.runningBalance || extractedData?.openingBalance || 0,
          closingBalance:
            transactions[transactions.length - 1]?.runningBalance || extractedData?.closingBalance || 0,
        },
        { transaction },
      );

      const statementExtractedData = this.buildStatementExtractedData({
        bankStatement,
        extractedData: extractedData || {},
      });
      const analysis = analyzeDocument({
        text: ocrText || '',
        extractedData: statementExtractedData,
        documentType: 'bank_statement',
      });

      await this.updateFileAttachmentAnalysis({
        documentId: ocrDocumentId || fileAttachmentId,
        filePath,
        companyId,
        analysis,
        extractedData: statementExtractedData,
      });

      return {
        bankStatement,
        transactions: processedTransactions,
        summary: {
          totalImported: transactions.length,
          totalProcessed: processedTransactions.length,
          duplicatesSkipped: transactions.length - processedTransactions.length,
          ocrConfidence,
          ocrWarnings,
          extractedData,
          ocrText,
          analysis,
        },
      };
    } catch (error) {
      if (bankStatement) {
        try {
          await bankStatement.update({ status: 'FAILED' }, { transaction });
        } catch (statusError) {
          // intentionally ignored to preserve original error
        }
      }
      throw error;
    }
  }

  async registerDryRun({
    companyId,
    userId,
    filePath,
    fileName,
    format,
    summary,
    matchesCount = 0,
    unmatchedCount = 0,
    warningsCount = 0,
  }) {
    const confirmationToken = crypto.randomBytes(32).toString('hex');

    return BankStatementImportDryRun.create({
      companyId,
      userId,
      confirmationToken,
      filePath,
      fileName,
      fileFormat: format,
      summary,
      totalTransactions: summary?.transactionsDetected || 0,
      processedTransactions: summary?.validTransactions || 0,
      matches: matchesCount,
      unmatched: unmatchedCount,
      warnings: warningsCount,
    });
  }

  async confirmDryRunImport({ dryRunId, companyId, transaction }) {
    if (!transaction) {
      throw new Error('Confirming an import requires an active transaction');
    }

    const findOptions = {
      where: {
        id: dryRunId,
        companyId,
      },
      transaction,
    };
    if (transaction.LOCK) {
      findOptions.lock = transaction.LOCK.UPDATE;
    }

    const dryRun = await BankStatementImportDryRun.findOne(findOptions);
    if (!dryRun) {
      const error = new Error('Dry run not found');
      error.status = 404;
      throw error;
    }

    if (dryRun.status !== DRY_RUN_STATUS.PENDING) {
      const error = new Error('Dry run already consumed');
      error.status = 409;
      throw error;
    }

    await dryRun.update({ status: DRY_RUN_STATUS.PROCESSING }, { transaction });

    try {
      const importResult = await this._runBankStatementImport({
        companyId,
        filePath: dryRun.filePath,
        fileName: dryRun.fileName,
        format: dryRun.fileFormat,
        transaction,
      });

      await dryRun.update(
        {
          status: DRY_RUN_STATUS.CONFIRMED,
          bankStatementId: importResult.bankStatement.id,
          summary: importResult.summary,
          totalTransactions: importResult.summary.totalImported,
          processedTransactions: importResult.summary.totalProcessed,
          confirmedAt: new Date(),
          errorMessage: null,
        },
        { transaction },
      );

      return {
        dryRunId: dryRun.id,
        summary: importResult.summary,
        bankStatement: importResult.bankStatement,
      };
    } catch (importError) {
      await dryRun.update(
        {
          status: DRY_RUN_STATUS.FAILED,
          errorMessage: importError.message,
          confirmedAt: new Date(),
        },
        { transaction },
      );
      throw importError;
    }
  }

  async parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const transactions = [];

      fs.createReadStream(filePath)
        .pipe(
          csv({
            separator: ';',
            mapHeaders: ({ header }) => header.trim().toLowerCase(),
          }),
        )
        .on('data', (row) => {
          try {
            const transaction = this.parseCSVRow(row);
            if (transaction) {
              transactions.push(transaction);
            }
          } catch (error) {
            // TODO: implement
          }
        })
        .on('end', () => {
          resolve(transactions);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  parseCSVRow(row) {
    const dateFormats = ['DD.MM.YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];

    const mappings = [
      {
        date: row['buchungstag'] || row['wertstellung'] || row['date'],
        amount: row['betrag'] || row['amount'],
        description: row['verwendungszweck'] || row['description'] || row['zweck'],
        counterparty: row['empfänger/zahlungspflichtiger'] || row['counterparty'],
        reference: row['referenz'] || row['reference'] || '',
      },

      {
        date: row['booking date'] || row['value date'],
        amount: row['amount'],
        description: row['description'] || row['purpose'],
        counterparty: row['counterparty'],
        reference: row['transaction reference'],
      },

      {
        date: row['date'] || row['datum'],
        amount: row['amount'] || row['betrag'],
        description: row['description'] || row['beschreibung'],
        counterparty: row['counterparty'] || row['gegenkonto'],
        reference: row['reference'] || row['referenz'],
      },
    ];

    let transaction = null;

    for (const mapping of mappings) {
      if (mapping.date && mapping.amount) {
        transaction = {
          transactionDate: this.parseDate(mapping.date, dateFormats),
          valueDate: this.parseDate(mapping.date, dateFormats),
          amount: this.parseAmount(mapping.amount),
          description: mapping.description || '',
          counterpartyName: mapping.counterparty || '',
          reference: mapping.reference || '',
          transactionType: null,
          currency: 'EUR',
        };
        break;
      }
    }

    if (!transaction) {
      return null;
    }

    if (transaction.amount > 0) {
      transaction.transactionType = 'CREDIT';
    } else {
      transaction.transactionType = 'DEBIT';
      transaction.amount = Math.abs(transaction.amount);
    }

    transaction.category = this.autoCategorizeBankTransaction(transaction);

    return transaction;
  }

  async parseMT940File(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const transactions = [];

    const blocks = content.split(':20:').filter((block) => block.trim());

    for (const block of blocks) {
      try {
        const transaction = this.parseMT940Block(block);
        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        // TODO: implement
      }
    }

    return transactions;
  }

  parseMT940Block(block) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);
    const transaction = {
      currency: 'EUR',
      transactionType: 'DEBIT',
    };

    for (const line of lines) {
      if (line.startsWith(':61:')) {
        const match = line.match(/:61:(\d{6})(\d{4})?([CD])(\d+,\d+)/);
        if (match) {
          transaction.valueDate = this.parseMT940Date(match[1]);
          transaction.transactionDate = transaction.valueDate;
          transaction.transactionType = match[3] === 'C' ? 'CREDIT' : 'DEBIT';
          transaction.amount = parseFloat(match[4].replace(',', '.'));
        }
      } else if (line.startsWith(':86:')) {
        transaction.description = line.substring(4);
        transaction.reference = transaction.description.substring(0, 50);
      }
    }

    if (!transaction.transactionDate || !transaction.amount) {
      return null;
    }

    transaction.category = this.autoCategorizeBankTransaction(transaction);
    return transaction;
  }

  async parseCAMT053File(_filePath) {
    const transactions = [];

    return transactions;
  }

  async processTransactions(companyId, bankStatementId, transactions, options = {}) {
    const processedTransactions = [];
    const transaction = options.transaction || null;

    for (const transactionData of transactions) {
      try {
        const findOptions = {
          where: {
            companyId,
            transactionDate: transactionData.transactionDate,
            amount: transactionData.amount,
            reference: transactionData.reference,
          },
        };
        if (transaction) {
          findOptions.transaction = transaction;
        }

        const existing = await BankTransaction.findOne(findOptions);

        if (existing) {
          continue;
        }

        const bankTransaction = await BankTransaction.create(
          {
            companyId,
            bankStatementId,
            ...transactionData,
          },
          transaction ? { transaction } : {},
        );

        processedTransactions.push(bankTransaction);
      } catch (error) {
        // TODO: implement
      }
    }

    return processedTransactions;
  }

  async dryRunImportBankStatement(companyId, filePath, format) {
    const normalizedFormat = (format || '').toString().toUpperCase();
    if (normalizedFormat === 'OCR') {
      const preview = await ocrService.previewDocument(filePath, { documentType: 'bank_statement' });
      if (!preview.success) {
        throw new Error(preview.error || 'OCR preview failed');
      }
      const analysis = analyzeDocument({
        text: preview.text || '',
        extractedData: preview.extractedData || {},
        documentType: 'bank_statement',
      });
      const summary = {
        transactionsDetected: 0,
        validTransactions: 0,
        invalidTransactions: 0,
        currency: 'EUR',
        dateRange: {
          from: this.parsePeriodStart(preview.extractedData?.period)?.toISOString() || null,
          to: this.parsePeriodEnd(preview.extractedData?.period)?.toISOString() || null,
        },
        ocrConfidence: preview.confidence,
        extractedData: preview.extractedData,
        analysis,
      };
      return {
        summary,
        matches: [],
        unmatched: [],
        warnings: preview.warnings || [],
        explanations: preview.explanations || [],
      };
    }
    const parsedTransactions = await this.loadTransactionsFromFile(filePath, format);
    const warnings = [];
    const matches = [];
    const unmatched = [];
    const validTransactions = [];

    for (let index = 0; index < parsedTransactions.length; index += 1) {
      const normalizedTransaction = this.normalizeTransaction(parsedTransactions[index]);
      const validation = this.validateTransaction(normalizedTransaction);
      if (!validation.valid) {
        warnings.push({
          row: index + 1,
          message: 'Transaction validation failed',
          errors: validation.errors,
          transaction: normalizedTransaction,
        });
        continue;
      }

      const duplicate = await this.isDuplicateTransaction(companyId, normalizedTransaction);
      if (duplicate) {
        warnings.push({
          row: index + 1,
          message: 'Duplicate transaction detected; already exists in bank transactions.',
          transaction: normalizedTransaction,
        });
        continue;
      }

      validTransactions.push(normalizedTransaction);
    }

    for (const transaction of validTransactions) {
      const match = await this.matchAgainstLedger(companyId, transaction);
      if (match) {
        matches.push(match);
      } else {
        unmatched.push({
          transaction,
          reason: 'No matching ledger transaction found',
        });
      }
    }

    const summary = {
      transactionsDetected: parsedTransactions.length,
      validTransactions: validTransactions.length,
      invalidTransactions: parsedTransactions.length - validTransactions.length,
      currency: validTransactions[0]?.currency || 'EUR',
      dateRange: {
        from: validTransactions.length
          ? this.getEarliestDate(validTransactions).toISOString()
          : null,
        to: validTransactions.length ? this.getLatestDate(validTransactions).toISOString() : null,
      },
    };

    const extractedData = this.buildExtractedDataFromTransactions(validTransactions);
    const analysis = analyzeDocument({
      text: '',
      extractedData,
      documentType: 'bank_statement',
    });
    summary.extractedData = extractedData;
    summary.analysis = analysis;

    return {
      summary,
      matches,
      unmatched,
      warnings,
    };
  }

  parsePeriodStart(period) {
    if (!period) {
      return null;
    }
    const match = period.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
    return match ? moment(match[1], 'DD.MM.YYYY').toDate() : null;
  }

  parsePeriodEnd(period) {
    if (!period) {
      return null;
    }
    const matches = period.match(/(\d{1,2}\.\d{1,2}\.\d{4})/g);
    if (!matches || matches.length < 2) {
      return null;
    }
    return moment(matches[1], 'DD.MM.YYYY').toDate();
  }

  normalizeTransaction(transaction = {}) {
    const parsedAmount =
      typeof transaction.amount === 'string'
        ? this.parseAmount(transaction.amount)
        : transaction.amount;

    const normalized = {
      ...transaction,
      transactionDate: transaction.transactionDate ? new Date(transaction.transactionDate) : null,
      valueDate: transaction.valueDate ? new Date(transaction.valueDate) : null,
      amount: Number.isFinite(parsedAmount) ? parseFloat(parsedAmount) : 0,
      currency: (transaction.currency || 'EUR').toUpperCase(),
      description: (transaction.description || '').trim(),
      counterpartyName: (transaction.counterpartyName || '').trim(),
      reference: (transaction.reference || '').trim(),
      category: transaction.category || null,
    };

    normalized.category = normalized.category || this.autoCategorizeBankTransaction(normalized);
    return normalized;
  }

  validateTransaction(transaction) {
    const errors = [];

    if (!transaction) {
      errors.push('Transaction payload unavailable');
      return { valid: false, errors };
    }

    if (!transaction.transactionDate || Number.isNaN(transaction.transactionDate.getTime())) {
      errors.push('Invalid transaction date');
    }

    if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) {
      errors.push('Invalid amount value');
    }

    return { valid: errors.length === 0, errors };
  }

  async isDuplicateTransaction(companyId, transaction) {
    if (!transaction) {
      return false;
    }

    const existing = await BankTransaction.findOne({
      where: {
        companyId,
        transactionDate: transaction.transactionDate,
        amount: transaction.amount,
        reference: transaction.reference,
      },
    });

    return Boolean(existing);
  }

  async matchAgainstLedger(companyId, transaction) {
    if (!transaction) {
      return null;
    }

    const windowDays = 3;
    const centerDate = moment(transaction.transactionDate);
    const candidates = await Transaction.findAll({
      where: {
        companyId,
        amount: transaction.amount,
        transactionDate: {
          [Op.between]: [
            centerDate.clone().subtract(windowDays, 'days').toDate(),
            centerDate.clone().add(windowDays, 'days').toDate(),
          ],
        },
      },
      limit: 10,
      order: [['transactionDate', 'ASC']],
    });

    if (!candidates.length) {
      return null;
    }

    let bestMatch = null;
    let bestScore = -Infinity;

    for (const candidate of candidates) {
      const candidateDate = candidate.transactionDate ? new Date(candidate.transactionDate) : null;
      const dateDistance = candidateDate
        ? Math.abs(moment(candidateDate).diff(transaction.transactionDate, 'days'))
        : 0;
      const similarity = this.calculateDescriptionSimilarity(
        transaction.description || '',
        candidate.description || '',
      );
      const score = similarity - dateDistance * 0.1;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    if (!bestMatch) {
      return null;
    }

    const ledgerTransaction = bestMatch.get ? bestMatch.get({ plain: true }) : { ...bestMatch };
    const explanation = this.buildMatchExplanation(transaction, ledgerTransaction);

    return {
      bankTransaction: transaction,
      ledgerTransaction: {
        ...ledgerTransaction,
        transactionDate: ledgerTransaction.transactionDate
          ? new Date(ledgerTransaction.transactionDate).toISOString()
          : null,
      },
      explanation,
    };
  }

  buildMatchExplanation(bankTransaction, ledgerTransaction) {
    const ledgerDate = ledgerTransaction.transactionDate
      ? new Date(ledgerTransaction.transactionDate)
      : null;
    const dateDelta = ledgerDate
      ? Math.abs(moment(bankTransaction.transactionDate).diff(ledgerDate, 'days'))
      : 0;
    const amountDelta = Math.abs(
      bankTransaction.amount - parseFloat(ledgerTransaction.amount || 0),
    );
    const similarity = this.calculateDescriptionSimilarity(
      bankTransaction.description || '',
      ledgerTransaction.description || '',
    );

    return `Amount difference ${amountDelta.toFixed(2)}; Date difference ${dateDelta} days; Description similarity ${similarity.toFixed(
      2,
    )}`;
  }

  autoCategorizeBankTransaction(transaction) {
    const description = transaction.description?.toLowerCase() || '';
    const counterparty = transaction.counterpartyName?.toLowerCase() || '';

    if (
      description.includes('gutschrift') ||
      (description.includes('überweisung') && transaction.transactionType === 'CREDIT')
    ) {
      return 'REVENUE';
    }

    if (description.includes('miete') || description.includes('rent')) {
      return 'RENT';
    }

    if (
      description.includes('gehalt') ||
      description.includes('lohn') ||
      description.includes('salary')
    ) {
      return 'SALARY';
    }

    if (
      description.includes('strom') ||
      description.includes('gas') ||
      description.includes('wasser')
    ) {
      return 'UTILITIES';
    }

    if (description.includes('büro') || description.includes('office')) {
      return 'OFFICE_SUPPLIES';
    }

    if (description.includes('marketing') || description.includes('werbung')) {
      return 'MARKETING';
    }

    if (description.includes('beratung') || description.includes('consulting')) {
      return 'CONSULTING';
    }

    if (description.includes('versicherung') || description.includes('insurance')) {
      return 'INSURANCE';
    }

    if (
      description.includes('steuer') ||
      description.includes('tax') ||
      counterparty.includes('finanzamt')
    ) {
      return 'TAX_PAYMENT';
    }

    if (description.includes('zinsen') || description.includes('interest')) {
      return 'INTEREST';
    }

    if (description.includes('gebühr') || description.includes('fee')) {
      return 'BANK_CHARGES';
    }

    return 'OTHER';
  }

  async reconcileTransactions(companyId) {
    const { Transaction } = require('../models');

    const unreconciled = await BankTransaction.findAll({
      where: {
        companyId,
        isReconciled: false,
      },
    });

    const reconciled = [];

    for (const bankTx of unreconciled) {
      const potentialMatches = await Transaction.findAll({
        where: {
          companyId,
          amount: bankTx.amount,
          transactionDate: {
            [require('sequelize').Op.between]: [
              moment(bankTx.transactionDate).subtract(3, 'days').toDate(),
              moment(bankTx.transactionDate).add(3, 'days').toDate(),
            ],
          },
        },
      });

      for (const tx of potentialMatches) {
        const similarity = this.calculateDescriptionSimilarity(bankTx.description, tx.description);

        if (similarity > 0.7) {
          await bankTx.update({
            isReconciled: true,
            reconciledWith: tx.id,
          });

          await tx.update({
            isReconciled: true,
            bankTransactionId: bankTx.id,
          });

          reconciled.push({ bankTransaction: bankTx, transaction: tx });
          break;
        }
      }
    }

    return reconciled;
  }

  parseDate(dateString, formats) {
    for (const format of formats) {
      const date = moment(dateString, format, true);
      if (date.isValid()) {
        return date.toDate();
      }
    }
    throw new Error(`Invalid date format: ${dateString}`);
  }

  parseAmount(amountString) {
    if (typeof amountString === 'number') {
      return amountString;
    }

    const cleaned = amountString
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '');

    return parseFloat(cleaned) || 0;
  }

  parseMT940Date(dateString) {
    const year = parseInt('20' + dateString.substring(0, 2));
    const month = parseInt(dateString.substring(2, 4)) - 1;
    const day = parseInt(dateString.substring(4, 6));
    return new Date(year, month, day);
  }

  getEarliestDate(transactions) {
    return (
      transactions.reduce((earliest, tx) => {
        return !earliest || tx.transactionDate < earliest ? tx.transactionDate : earliest;
      }, null) || new Date()
    );
  }

  getLatestDate(transactions) {
    return (
      transactions.reduce((latest, tx) => {
        return !latest || tx.transactionDate > latest ? tx.transactionDate : latest;
      }, null) || new Date()
    );
  }

  calculateDescriptionSimilarity(str1, str2) {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    return 1 - distance / maxLength;
  }

  async reconcileBankTransaction({
    bankTransactionId,
    targetType,
    targetId,
    companyId,
    userId,
    reason,
    ipAddress,
    userAgent,
  } = {}) {
    const parsedTargetType = (targetType || '').toString().toLowerCase();
    if (!['invoice', 'expense'].includes(parsedTargetType)) {
      const err = new Error('Invalid target type');
      err.status = 400;
      throw err;
    }

    const parsedTargetId = Number(targetId);
    if (!Number.isInteger(parsedTargetId) || parsedTargetId <= 0) {
      const err = new Error('targetId must be a valid number');
      err.status = 400;
      throw err;
    }

    const parsedBankTransactionId = Number(bankTransactionId);
    if (!Number.isInteger(parsedBankTransactionId) || parsedBankTransactionId <= 0) {
      const err = new Error('Invalid bank transaction id');
      err.status = 400;
      throw err;
    }

    const logReason = (reason || '').toString().trim() || 'Manual reconciliation confirmed';
    const transaction = await sequelize.transaction();
    try {
      const bankTransaction = await BankTransaction.findOne({
        where: {
          id: parsedBankTransactionId,
          companyId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!bankTransaction) {
        const err = new Error('Bank transaction not found');
        err.status = 404;
        throw err;
      }

      if (bankTransaction.isReconciled) {
        const err = new Error('Bank transaction already reconciled');
        err.status = 409;
        throw err;
      }

      const targetModel = parsedTargetType === 'invoice' ? Invoice : Expense;
      const targetLabel = parsedTargetType === 'invoice' ? 'Invoice' : 'Expense';
      const target = await targetModel.findOne({
        where: { id: parsedTargetId, companyId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!target) {
        const err = new Error(`${targetLabel} not found`);
        err.status = 404;
        throw err;
      }

      const transactionDate =
        parsedTargetType === 'invoice'
          ? new Date(target.date || target.createdAt || Date.now())
          : new Date(target.expenseDate || target.createdAt || Date.now());
      const amount =
        parsedTargetType === 'invoice'
          ? Number(target.amount ?? target.total ?? 0)
          : Number(target.grossAmount ?? target.netAmount ?? 0);

      if (!Number.isFinite(amount) || amount <= 0) {
        const err = new Error('Target must have a valid amount to reconcile');
        err.status = 400;
        throw err;
      }

      const description =
        parsedTargetType === 'invoice'
          ? `Invoice ${target.invoiceNumber || target.id}`
          : target.description || `Expense ${target.id}`;
      const ledgerTransaction = await Transaction.create(
        {
          companyId,
          userId: target.userId ?? target.createdByUserId ?? userId,
          transactionDate,
          description,
          amount,
          currency: target.currency || 'EUR',
          type: parsedTargetType === 'invoice' ? 'income' : 'expense',
          reference: `${parsedTargetType}:${target.id}`,
          isReconciled: true,
          bankTransactionId: bankTransaction.id,
        },
        { transaction },
      );

      await bankTransaction.update(
        {
          isReconciled: true,
          reconciledWith: ledgerTransaction.id,
        },
        { transaction },
      );

      const updatedBankTransaction = await bankTransaction.reload({ transaction });

      await AuditLogService.appendEntry({
        action: 'bank_transaction_reconciled',
        resourceType: 'BankTransaction',
        resourceId: String(bankTransaction.id),
        userId,
        oldValues: {
          isReconciled: false,
          reconciledWith: null,
        },
        newValues: {
          isReconciled: true,
          reconciledWith: ledgerTransaction.id,
          metadata: {
            bankTransactionId: bankTransaction.id,
            targetType: parsedTargetType,
            targetId: parsedTargetId,
          },
        },
        reason: logReason,
        ipAddress,
        userAgent,
        transaction,
      });

      await transaction.commit();
      return { bankTransaction: updatedBankTransaction };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async undoManualReconciliation({
    bankTransactionId,
    companyId,
    userId,
    reason,
    ipAddress,
    userAgent,
  } = {}) {
    const parsedBankTransactionId = Number(bankTransactionId);
    if (!Number.isInteger(parsedBankTransactionId) || parsedBankTransactionId <= 0) {
      const err = new Error('Invalid bank transaction id');
      err.status = 400;
      throw err;
    }
    const logReason = (reason || '').toString().trim();
    if (!logReason) {
      const err = new Error('Reason is required to undo reconciliation');
      err.status = 400;
      throw err;
    }

    const transaction = await sequelize.transaction();
    try {
      const bankTransaction = await BankTransaction.findOne({
        where: {
          id: parsedBankTransactionId,
          companyId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!bankTransaction) {
        const err = new Error('Bank transaction not found');
        err.status = 404;
        throw err;
      }

      if (!bankTransaction.isReconciled) {
        const err = new Error('Bank transaction is not reconciled');
        err.status = 409;
        throw err;
      }

      const previousReconciledWith = bankTransaction.reconciledWith;
      const previousWasReconciled = bankTransaction.isReconciled;

      const ledgerTransaction = await Transaction.findOne({
        where: {
          bankTransactionId: bankTransaction.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      await bankTransaction.update(
        {
          isReconciled: false,
          reconciledWith: null,
        },
        {
          transaction,
          lock: transaction.LOCK.UPDATE,
          allowReconcileUndo: true,
        },
      );

      if (ledgerTransaction) {
        await ledgerTransaction.update(
          {
            isReconciled: false,
            bankTransactionId: null,
          },
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          },
        );
      }

      const updatedBankTransaction = await bankTransaction.reload({ transaction });

      await AuditLogService.appendEntry({
        action: 'bank_transaction_reconciliation_undone',
        resourceType: 'BankTransaction',
        resourceId: String(bankTransaction.id),
        userId,
        oldValues: {
          isReconciled: previousWasReconciled,
          reconciledWith: previousReconciledWith,
        },
        newValues: {
          isReconciled: false,
          reconciledWith: null,
          metadata: {
            bankTransactionId: bankTransaction.id,
            ledgerTransactionId: ledgerTransaction?.id ?? null,
          },
        },
        reason: logReason,
        ipAddress,
        userAgent,
        transaction,
      });

      await transaction.commit();
      return { bankTransaction: updatedBankTransaction };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getAuditLogEntriesForStatement({ statementId, companyId } = {}) {
    const parsedStatementId = Number(statementId);
    if (!Number.isInteger(parsedStatementId) || parsedStatementId <= 0) {
      const err = new Error('Invalid bank statement id');
      err.status = 400;
      throw err;
    }

    const statement = await BankStatement.findOne({
      where: {
        id: parsedStatementId,
        companyId,
      },
      attributes: ['id'],
    });

    if (!statement) {
      const err = new Error('Bank statement not found');
      err.status = 404;
      throw err;
    }

    const transactions = await BankTransaction.findAll({
      where: {
        bankStatementId: statement.id,
        companyId,
      },
      attributes: ['id'],
    });

    const transactionIds = transactions.map((tx) => String(tx.id));
    if (!transactionIds.length) {
      return [];
    }

    const logs = await AuditLog.findAll({
      where: {
        resourceType: 'BankTransaction',
        resourceId: {
          [Op.in]: transactionIds,
        },
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
        },
      ],
      order: [['timestamp', 'DESC']],
    });

    return logs.map((log) => log.get({ plain: true }));
  }
}

module.exports = new BankStatementService();
