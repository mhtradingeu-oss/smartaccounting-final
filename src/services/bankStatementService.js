const csv = require('csv-parser');
const fs = require('fs');
const moment = require('moment');
const { BankStatement, BankTransaction } = require('../models');

class BankStatementService {
  constructor() {
    this.supportedFormats = ['CSV', 'MT940', 'CAMT053'];
  }

  async importBankStatement(companyId, filePath, fileName, format) {
    try {
      const bankStatement = await BankStatement.create({
        companyId,
        fileName,
        fileFormat: format,
        accountNumber: 'TEMP', 
        statementPeriodStart: new Date(),
        statementPeriodEnd: new Date(),
        openingBalance: 0,
        closingBalance: 0,
        status: 'PROCESSING',
      });

      let transactions = [];

      switch (format.toUpperCase()) {
        case 'CSV':
          transactions = await this.parseCSVFile(filePath);
          break;
        case 'MT940':
          transactions = await this.parseMT940File(filePath);
          break;
        case 'CAMT053':
          transactions = await this.parseCAMT053File(filePath);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const processedTransactions = await this.processTransactions(
        companyId, 
        bankStatement.id, 
        transactions,
      );

      await bankStatement.update({
        totalTransactions: transactions.length,
        processedTransactions: processedTransactions.length,
        status: 'COMPLETED',
        accountNumber: transactions[0]?.accountNumber || 'UNKNOWN',
        statementPeriodStart: this.getEarliestDate(transactions),
        statementPeriodEnd: this.getLatestDate(transactions),
        openingBalance: transactions[0]?.runningBalance || 0,
        closingBalance: transactions[transactions.length - 1]?.runningBalance || 0,
      });

      return {
        bankStatement,
        transactions: processedTransactions,
        summary: {
          totalImported: transactions.length,
          totalProcessed: processedTransactions.length,
          duplicatesSkipped: transactions.length - processedTransactions.length,
        },
      };

    } catch (error) {
      throw new Error(`Failed to import bank statement: ${error.message}`);
    }
  }

  async parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const transactions = [];
      
      fs.createReadStream(filePath)
        .pipe(csv({
          separator: ';', 
          mapHeaders: ({ header }) => header.trim().toLowerCase(),
        }))
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

    const blocks = content.split(':20:').filter(block => block.trim());
    
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
    const lines = block.split('\n').map(line => line.trim()).filter(line => line);
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

  async processTransactions(companyId, bankStatementId, transactions) {
    const processedTransactions = [];

    for (const transactionData of transactions) {
      try {
        
        const existing = await BankTransaction.findOne({
          where: {
            companyId,
            transactionDate: transactionData.transactionDate,
            amount: transactionData.amount,
            reference: transactionData.reference,
          },
        });

        if (existing) {
          continue;
        }

        const bankTransaction = await BankTransaction.create({
          companyId,
          bankStatementId,
          ...transactionData,
        });

        processedTransactions.push(bankTransaction);
      } catch (error) {
        // TODO: implement
      }
    }

    return processedTransactions;
  }

  autoCategorizeBankTransaction(transaction) {
    const description = transaction.description?.toLowerCase() || '';
    const counterparty = transaction.counterpartyName?.toLowerCase() || '';

    if (description.includes('gutschrift') || 
        description.includes('überweisung') && transaction.transactionType === 'CREDIT') {
      return 'REVENUE';
    }

    if (description.includes('miete') || description.includes('rent')) {
      return 'RENT';
    }
    
    if (description.includes('gehalt') || description.includes('lohn') || description.includes('salary')) {
      return 'SALARY';
    }
    
    if (description.includes('strom') || description.includes('gas') || description.includes('wasser')) {
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
    
    if (description.includes('steuer') || description.includes('tax') || counterparty.includes('finanzamt')) {
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
        const similarity = this.calculateDescriptionSimilarity(
          bankTx.description, 
          tx.description,
        );
        
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
    return transactions.reduce((earliest, tx) => {
      return !earliest || tx.transactionDate < earliest ? tx.transactionDate : earliest;
    }, null) || new Date();
  }

  getLatestDate(transactions) {
    return transactions.reduce((latest, tx) => {
      return !latest || tx.transactionDate > latest ? tx.transactionDate : latest;
    }, null) || new Date();
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
}

module.exports = new BankStatementService();
