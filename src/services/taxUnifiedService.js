
const GermanTaxUtils = require('../utils/germanTaxUtils');
const { Transaction } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const logger = require('../lib/logger');

class TaxUnifiedService {
  constructor() {
    this.vatRates = GermanTaxUtils.vatRates;
    this.taxThresholds = GermanTaxUtils.taxThresholds;
  }

  validateTransactionFields(requiredFields, featureName) {
    const missing = requiredFields.filter(
      field => !(Transaction && Transaction.rawAttributes && Transaction.rawAttributes[field]),
    );

    if (missing.length) {
      const error = new Error(`${featureName} unavailable: missing model fields (${missing.join(', ')})`);
      error.statusCode = 501;
      error.code = 'INSUFFICIENT_DATA';
      error.missingFields = missing;
      throw error;
    }
  }

  async calculateVATReturn(companyId, period) {
    try {
      this.validateTransactionFields(['transactionDate', 'type', 'amount', 'vatRate', 'vatAmount'], 'VAT return');

      const { year, quarter, month } = period;
      let startDate, endDate;

      if (quarter) {
        startDate = moment(`${year}-${(quarter - 1) * 3 + 1}-01`).startOf('month');
        endDate = moment(startDate).add(2, 'months').endOf('month');
      } else if (month) {
        startDate = moment(`${year}-${month}-01`).startOf('month');
        endDate = moment(startDate).endOf('month');
      }

      const transactions = await this.getTransactionsForPeriod(companyId, startDate, endDate);
      
      const vatReturn = {
        period: { year, quarter, month },
        taxableSupplies: {
          standardRate: { net: 0, vat: 0 },
          reducedRate: { net: 0, vat: 0 },
          exempt: { net: 0, vat: 0 },
        },
        inputVat: {
          standardRate: 0,
          reducedRate: 0,
          total: 0,
        },
        calculations: {
          totalOutputVat: 0,
          totalInputVat: 0,
          vatPayable: 0,
        },
      };

      for (const transaction of transactions) {
        if (transaction.type === 'income') {
          this.processIncomeTransaction(transaction, vatReturn);
        } else if (transaction.type === 'expense') {
          this.processExpenseTransaction(transaction, vatReturn);
        }
      }

      this.calculateVATTotals(vatReturn);
      return vatReturn;
    } catch (error) {
      logger.error('VAT return calculation error:', error);
      throw error;
    }
  }

  async calculateEUR(companyId, year) {
    try {
      this.validateTransactionFields(['transactionDate', 'type', 'amount', 'vatRate'], 'EÜR calculation');

      const startDate = moment(`${year}-01-01`).startOf('day');
      const endDate = moment(`${year}-12-31`).endOf('day');
      
      const transactions = await this.getTransactionsForPeriod(companyId, startDate, endDate);
      
      const eurData = {
        period: { year },
        income: {
          total: 0,
          byCategory: {},
          taxableIncome: 0,
        },
        expenses: {
          total: 0,
          byCategory: {},
          deductible: 0,
        },
        profit: 0,
        taxEstimate: {
          incomeTax: 0,
          tradeTax: 0,
          socialSecurity: 0,
          total: 0,
        },
      };

      for (const transaction of transactions) {
        if (transaction.type === 'income') {
          eurData.income.total += parseFloat(transaction.amount);
          const category = GermanTaxUtils.categorizeGermanExpense(transaction.description);
          eurData.income.byCategory[category] = (eurData.income.byCategory[category] || 0) + parseFloat(transaction.amount);
        } else if (transaction.type === 'expense') {
          const amount = parseFloat(transaction.amount);
          eurData.expenses.total += amount;
          
          const category = GermanTaxUtils.categorizeGermanExpense(transaction.description);
          eurData.expenses.byCategory[category] = (eurData.expenses.byCategory[category] || 0) + amount;
          
          if (GermanTaxUtils.isTaxDeductible(category, transaction.description)) {
            eurData.expenses.deductible += amount;
          }
        }
      }

      eurData.profit = eurData.income.total - eurData.expenses.deductible;
      eurData.income.taxableIncome = eurData.profit;

      if (eurData.profit > 0) {
        eurData.taxEstimate.incomeTax = GermanTaxUtils.calculateIncomeTax(eurData.profit);
        eurData.taxEstimate.tradeTax = GermanTaxUtils.calculateTradeTax(eurData.profit);
        eurData.taxEstimate.socialSecurity = GermanTaxUtils.calculateSocialSecurity(eurData.profit);
        eurData.taxEstimate.total = eurData.taxEstimate.incomeTax + eurData.taxEstimate.tradeTax + eurData.taxEstimate.socialSecurity;
      }

      return eurData;
    } catch (error) {
      logger.error('EUR calculation error:', error);
      throw error;
    }
  }

  async checkKleinunternehmerEligibility(companyId, year) {
    try {
      const currentYearRevenue = await this.getTotalRevenue(companyId, year);
      const previousYearRevenue = await this.getTotalRevenue(companyId, year - 1);

      return {
        isEligible: GermanTaxUtils.isKleinunternehmerEligible(currentYearRevenue, previousYearRevenue),
        currentYearRevenue,
        previousYearRevenue,
        threshold: GermanTaxUtils.taxThresholds.kleinunternehmer,
        recommendation: currentYearRevenue > GermanTaxUtils.taxThresholds.kleinunternehmer 
          ? 'VAT registration required' 
          : 'Eligible for small business scheme',
      };
    } catch (error) {
      logger.error('Kleinunternehmer eligibility check error:', error);
      throw error;
    }
  }

  async generateElsterExport(companyId, vatReturn) {
    try {
      const elsterFields = GermanTaxUtils.generateElsterFields(vatReturn.taxableSupplies);
      
      const elsterXML = `<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http://www.elster.de/elsterweb/schema/elster_common">
  <TransferHeader>
    <Verfahren>ElsterAnmeldung</Verfahren>
    <DatenArt>UStVA</DatenArt>
    <Vorgang>send-Nova</Vorgang>
    <TransferTicket>${this.generateTransferTicket()}</TransferTicket>
    <Testmerker>700000004</Testmerker>
  </TransferHeader>
  <DatenTeil>
    <Nutzdatenblock>
      <Nutzdaten>
        <Anmeldung>
          <Anmeldungssteuern>
            <Kz81>${elsterFields.Kz81}</Kz81>
            <Kz86>${elsterFields.Kz86}</Kz86>
            <Kz83>${elsterFields.Kz83}</Kz83>
            <Kz87>${elsterFields.Kz87}</Kz87>
            <Kz66>${elsterFields.Kz66}</Kz66>
          </Anmeldungssteuern>
        </Anmeldung>
      </Nutzdaten>
    </Nutzdatenblock>
  </DatenTeil>
</Elster>`;

      return {
        xml: elsterXML,
        filename: `UStVA_${vatReturn.period.year}_${vatReturn.period.quarter || vatReturn.period.month}.xml`,
        fields: elsterFields,
      };
    } catch (error) {
      logger.error('ELSTER export generation error:', error);
      throw error;
    }
  }

  // Private helper methods
  async getTransactionsForPeriod(companyId, startDate, endDate) {
    return await Transaction.findAll({
      where: {
        companyId,
        transactionDate: {
          [Op.between]: [startDate.toDate(), endDate.toDate()],
        },
      },
      order: [['transactionDate', 'ASC']],
    });
  }

  async getTotalRevenue(companyId, year) {
    const result = await Transaction.sum('amount', {
      where: {
        companyId,
        type: 'income',
        transactionDate: {
          [Op.between]: [
            new Date(`${year}-01-01`),
            new Date(`${year}-12-31`),
          ],
        },
      },
    });
    return result || 0;
  }

  processIncomeTransaction(transaction, vatReturn) {
    const amount = parseFloat(transaction.amount);
    const vatRate = parseFloat(transaction.vatRate || 0);
    const vatAmount = parseFloat(transaction.vatAmount || 0);

    if (vatRate === 0.19) {
      vatReturn.taxableSupplies.standardRate.net += amount;
      vatReturn.taxableSupplies.standardRate.vat += vatAmount;
    } else if (vatRate === 0.07) {
      vatReturn.taxableSupplies.reducedRate.net += amount;
      vatReturn.taxableSupplies.reducedRate.vat += vatAmount;
    } else {
      vatReturn.taxableSupplies.exempt.net += amount;
    }
  }

  processExpenseTransaction(transaction, vatReturn) {
    const vatRate = parseFloat(transaction.vatRate || 0);
    const vatAmount = parseFloat(transaction.vatAmount || 0);

    if (vatAmount > 0) {
      if (vatRate === 0.19) {
        vatReturn.inputVat.standardRate += vatAmount;
      } else if (vatRate === 0.07) {
        vatReturn.inputVat.reducedRate += vatAmount;
      }
    }
  }

  calculateVATTotals(vatReturn) {
    vatReturn.calculations.totalOutputVat = 
      vatReturn.taxableSupplies.standardRate.vat + 
      vatReturn.taxableSupplies.reducedRate.vat;
    
    vatReturn.inputVat.total = 
      vatReturn.inputVat.standardRate + 
      vatReturn.inputVat.reducedRate;
    
    vatReturn.calculations.totalInputVat = vatReturn.inputVat.total;
    vatReturn.calculations.vatPayable = 
      vatReturn.calculations.totalOutputVat - vatReturn.calculations.totalInputVat;
  }

  generateTransferTicket() {
    return moment().format('YYYYMMDDHHmmss') + Math.random().toString(36).substr(2, 5);
  }
}

module.exports = new TaxUnifiedService();
