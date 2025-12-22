
const moment = require('moment');

class GermanTaxCompliance {
  constructor() {
    this.vatRates = {
      STANDARD: 0.19,
      REDUCED: 0.07,
      EXEMPT: 0.00,
    };
    
    this.taxCategories = {
      
      REVENUE: ['8000-8999'],
      OPERATING_EXPENSES: ['4000-4999'],
      PERSONNEL_COSTS: ['6000-6999'],
      DEPRECIATION: ['7000-7999'],
      FINANCIAL_EXPENSES: ['2000-2999'],
      EXTRAORDINARY_EXPENSES: ['9000-9999'],
    };
  }

  validateTransactionFields(requiredFields, featureName) {
    const { Transaction } = require('../models');
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

  async calculateEUR(companyId, year) {
    this.validateTransactionFields(['transactionDate', 'type', 'amount', 'vatRate'], 'EÜR calculation');

    const startDate = moment(`${year}-01-01`).startOf('day');
    const endDate = moment(`${year}-12-31`).endOf('day');

    const transactions = await this.getTransactionsForPeriod(companyId, startDate, endDate);
    
    const eurData = {
      period: { year, startDate: startDate.format(), endDate: endDate.format() },
      income: {
        totalRevenue: 0,
        revenueByVatRate: {
          standard19: 0,
          reduced7: 0,
          exempt: 0,
        },
      },
      expenses: {
        totalExpenses: 0,
        operatingExpenses: 0,
        personnelCosts: 0,
        depreciation: 0,
        financialExpenses: 0,
        extraordinaryExpenses: 0,
        expensesByVatRate: {
          inputVat19: 0,
          inputVat7: 0,
          nonDeductible: 0,
        },
      },
      profit: {
        grossProfit: 0,
        netProfit: 0,
        taxableIncome: 0,
      },
      vatSummary: {
        outputVat: 0,
        inputVat: 0,
        vatPayable: 0,
      },
    };

    transactions.forEach(transaction => {
      const type = (transaction.type || '').toUpperCase();
      
      if (type === 'INCOME') {
        eurData.income.totalRevenue += parseFloat(transaction.amount);

        switch (transaction.vatRate) {
          case 0.19:
            eurData.income.revenueByVatRate.standard19 += parseFloat(transaction.amount);
            eurData.vatSummary.outputVat += parseFloat(transaction.amount) * 0.19;
            break;
          case 0.07:
            eurData.income.revenueByVatRate.reduced7 += parseFloat(transaction.amount);
            eurData.vatSummary.outputVat += parseFloat(transaction.amount) * 0.07;
            break;
          default:
            eurData.income.revenueByVatRate.exempt += parseFloat(transaction.amount);
        }
      } else if (type === 'EXPENSE') {
        eurData.expenses.totalExpenses += parseFloat(transaction.amount);

        this.categorizeExpense(transaction, eurData.expenses);

        if (transaction.vatRate > 0) {
          const inputVat = parseFloat(transaction.amount) * transaction.vatRate;
          eurData.vatSummary.inputVat += inputVat;
          
          if (transaction.vatRate === 0.19) {
            eurData.expenses.expensesByVatRate.inputVat19 += inputVat;
          } else if (transaction.vatRate === 0.07) {
            eurData.expenses.expensesByVatRate.inputVat7 += inputVat;
          }
        } else {
          eurData.expenses.expensesByVatRate.nonDeductible += parseFloat(transaction.amount);
        }
      }
    });

    eurData.profit.grossProfit = eurData.income.totalRevenue - eurData.expenses.totalExpenses;
    eurData.profit.netProfit = eurData.profit.grossProfit;
    eurData.profit.taxableIncome = eurData.profit.netProfit;

    eurData.vatSummary.vatPayable = eurData.vatSummary.outputVat - eurData.vatSummary.inputVat;

    return eurData;
  }

  async generateVATReturn(companyId, period) {
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
        importVat: 0,
        otherInputVat: 0,
      },
      calculations: {
        totalOutputVat: 0,
        totalInputVat: 0,
        vatPayable: 0,
        vatRefund: 0,
      },
      elsterFields: {
        
        Kz81: 0, 
        Kz86: 0, 
        Kz35: 0, 
        Kz36: 0, 
        Kz41: 0, 
        Kz66: 0, 
        Kz83: 0,  
      },
    };

    transactions.forEach(transaction => {
      const type = (transaction.type || '').toUpperCase();

      if (type === 'INCOME') {
        if (transaction.vatRate === 0.19) {
          vatReturn.taxableSupplies.standardRate.net += parseFloat(transaction.amount);
          vatReturn.taxableSupplies.standardRate.vat += parseFloat(transaction.amount) * 0.19;
          vatReturn.elsterFields.Kz81 += parseFloat(transaction.amount);
          vatReturn.elsterFields.Kz86 += parseFloat(transaction.amount) * 0.19;
        } else if (transaction.vatRate === 0.07) {
          vatReturn.taxableSupplies.reducedRate.net += parseFloat(transaction.amount);
          vatReturn.taxableSupplies.reducedRate.vat += parseFloat(transaction.amount) * 0.07;
          vatReturn.elsterFields.Kz35 += parseFloat(transaction.amount);
          vatReturn.elsterFields.Kz36 += parseFloat(transaction.amount) * 0.07;
        } else {
          vatReturn.taxableSupplies.exempt.net += parseFloat(transaction.amount);
          vatReturn.elsterFields.Kz41 += parseFloat(transaction.amount);
        }
      } else if (type === 'EXPENSE' && transaction.vatRate > 0) {
        const inputVat = parseFloat(transaction.amount) * transaction.vatRate;
        if (transaction.vatRate === 0.19) {
          vatReturn.inputVat.standardRate += inputVat;
        } else if (transaction.vatRate === 0.07) {
          vatReturn.inputVat.reducedRate += inputVat;
        }
        vatReturn.elsterFields.Kz66 += inputVat;
      }
    });

    vatReturn.calculations.totalOutputVat = 
      vatReturn.taxableSupplies.standardRate.vat + 
      vatReturn.taxableSupplies.reducedRate.vat;
    
    vatReturn.calculations.totalInputVat = 
      vatReturn.inputVat.standardRate + 
      vatReturn.inputVat.reducedRate + 
      vatReturn.inputVat.importVat + 
      vatReturn.inputVat.otherInputVat;

    const netVat = vatReturn.calculations.totalOutputVat - vatReturn.calculations.totalInputVat;
    
    if (netVat > 0) {
      vatReturn.calculations.vatPayable = netVat;
      vatReturn.elsterFields.Kz83 = netVat;
    } else {
      vatReturn.calculations.vatRefund = Math.abs(netVat);
      vatReturn.elsterFields.Kz83 = netVat;
    }

    return vatReturn;
  }

  validateGoBDCompliance(transaction) {
    const compliance = {
      isCompliant: true,
      violations: [],
      warnings: [],
    };

    const { Transaction } = require('../models');
    const hasDocumentReferenceField = Transaction && Transaction.rawAttributes && Transaction.rawAttributes.documentReference;

    const txnDate = transaction.transactionDate || transaction.date;
    if (!txnDate) {
      compliance.violations.push('Missing transaction date');
      compliance.isCompliant = false;
    }

    if (!transaction.amount || transaction.amount === 0) {
      compliance.violations.push('Missing or zero amount');
      compliance.isCompliant = false;
    }

    if (!transaction.description || transaction.description.trim().length < 3) {
      compliance.violations.push('Insufficient transaction description');
      compliance.isCompliant = false;
    }

    if (hasDocumentReferenceField && !transaction.documentReference) {
      compliance.warnings.push('Missing document reference - recommended for audit trail');
    } else if (!hasDocumentReferenceField) {
      compliance.warnings.push('Transaction model missing documentReference field');
    }

    if (transaction.updatedAt && transaction.createdAt) {
      const daysDiff = moment(transaction.updatedAt).diff(moment(transaction.createdAt), 'days');
      if (daysDiff > 30) {
        compliance.warnings.push('Transaction modified more than 30 days after creation');
      }
    }

    if (transaction.vatRate && transaction.vatAmount) {
      const expectedVat = parseFloat(transaction.amount) * parseFloat(transaction.vatRate);
      const actualVat = parseFloat(transaction.vatAmount);
      if (Math.abs(expectedVat - actualVat) > 0.01) {
        compliance.violations.push('VAT calculation mismatch');
        compliance.isCompliant = false;
      }
    }

    return compliance;
  }

  async checkKleinunternehmerEligibility(companyId, year) {
    const currentYearRevenue = await this.getTotalRevenue(companyId, year);
    const previousYearRevenue = await this.getTotalRevenue(companyId, year - 1);

    const eligibility = {
      isEligible: false,
      currentYearRevenue,
      previousYearRevenue,
      threshold: 22000, 
      previousThreshold: 17500,
      reasons: [],
    };

    if (previousYearRevenue <= eligibility.previousThreshold && 
        currentYearRevenue <= eligibility.threshold) {
      eligibility.isEligible = true;
      eligibility.reasons.push('Revenue below thresholds for both years');
    } else {
      if (previousYearRevenue > eligibility.previousThreshold) {
        eligibility.reasons.push(`Previous year revenue (€${previousYearRevenue}) exceeds threshold`);
      }
      if (currentYearRevenue > eligibility.threshold) {
        eligibility.reasons.push(`Current year revenue (€${currentYearRevenue}) exceeds threshold`);
      }
    }

    return eligibility;
  }

  async generateElsterExport(companyId, vatReturn) {
    const elsterXML = `<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http:
  <TransferHeader version="11">
    <Verfahren>ElsterAnmeldung</Verfahren>
    <DatenArt>UStVA</DatenArt>
    <Vorgang>send-Nova</Vorgang>
    <TransferTicket>${this.generateTransferTicket()}</TransferTicket>
    <Testmerker>700000004</Testmerker>
    <SigUser />
    <Empfaenger id="F">
      <Zusatz>
        <Info>Umsatzsteuervoranmeldung</Info>
      </Zusatz>
    </Empfaenger>
    <Hersteller>
      <ProduktName>SmartAccounting</ProduktName>
      <ProduktVersion>1.0</ProduktVersion>
    </Hersteller>
    <DatenLieferant>SmartAccounting GmbH</DatenLieferant>
  </TransferHeader>
  <DatenTeil>
    <Nutzdatenblock>
      <Nutzdaten>
        <Anmeldung>
          <DatenLieferant>
            <Name>SmartAccounting</Name>
            <Strasse>Musterstraße 1</Strasse>
            <PLZ>12345</PLZ>
            <Ort>Musterstadt</Ort>
          </DatenLieferant>
          <Unternehmer>
            <Name>MH Trading UG</Name>
            <Vorname>Max</Vorname>
            <UStIdNr>DE123456789</UStIdNr>
          </Unternehmer>
          <Anmeldungssteuern>
            <Kz81>${Math.round(vatReturn.elsterFields.Kz81)}</Kz81>
            <Kz86>${Math.round(vatReturn.elsterFields.Kz86)}</Kz86>
            <Kz35>${Math.round(vatReturn.elsterFields.Kz35)}</Kz35>
            <Kz36>${Math.round(vatReturn.elsterFields.Kz36)}</Kz36>
            <Kz41>${Math.round(vatReturn.elsterFields.Kz41)}</Kz41>
            <Kz66>${Math.round(vatReturn.elsterFields.Kz66)}</Kz66>
            <Kz83>${Math.round(vatReturn.elsterFields.Kz83)}</Kz83>
          </Anmeldungssteuern>
        </Anmeldung>
      </Nutzdaten>
    </Nutzdatenblock>
  </DatenTeil>
</Elster>`;

    return {
      xml: elsterXML,
      filename: `UStVA_${vatReturn.period.year}_${vatReturn.period.quarter || vatReturn.period.month}.xml`,
      validationStatus: this.validateElsterXML(elsterXML),
    };
  }

  async getTransactionsForPeriod(companyId, startDate, endDate) {
    const { Transaction } = require('../models');
    return await Transaction.findAll({
      where: {
        companyId,
        transactionDate: {
          [require('sequelize').Op.between]: [startDate.toDate(), endDate.toDate()],
        },
      },
      order: [['transactionDate', 'ASC']],
    });
  }

  async getTotalRevenue(companyId, year) {
    const { Transaction } = require('../models');
    const result = await Transaction.sum('amount', {
      where: {
        companyId,
        type: 'income',
        transactionDate: {
          [require('sequelize').Op.between]: [
            new Date(`${year}-01-01`),
            new Date(`${year}-12-31`),
          ],
        },
      },
    });
    return result || 0;
  }

  categorizeExpense(transaction, expenses) {
    
    const category = transaction.category?.toLowerCase() || '';
    const description = transaction.description?.toLowerCase() || '';

    if (category.includes('salary') || description.includes('gehalt')) {
      expenses.personnelCosts += parseFloat(transaction.amount);
    } else if (category.includes('office') || description.includes('büro')) {
      expenses.operatingExpenses += parseFloat(transaction.amount);
    } else if (category.includes('depreciation') || description.includes('abschreibung')) {
      expenses.depreciation += parseFloat(transaction.amount);
    } else if (category.includes('interest') || description.includes('zinsen')) {
      expenses.financialExpenses += parseFloat(transaction.amount);
    } else {
      expenses.operatingExpenses += parseFloat(transaction.amount);
    }
  }

  generateTransferTicket() {
    return moment().format('YYYYMMDDHHmmss') + Math.random().toString(36).substr(2, 5);
  }

  validateElsterXML(xml) {
   
    try {
      
      return {
        isValid: xml.includes('<Elster') && xml.includes('</Elster>'),
        errors: [],
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message],
      };
    }
  }

  calculateVAT(amount, rateKey = 'standard') {
    const rates = {
      standard: 0.19,
      reduced: 0.07,
      exempt: 0.0,
    };

    const rate = rates[rateKey.toLowerCase()] ?? 0;
    return Number((parseFloat(amount || 0) * rate).toFixed(2));
  }

  async generateQuarterlyReport({ quarter, year, transactions = [] }) {
    const totalRevenue = transactions.reduce((sum, txn) => sum + (Number(txn.amount) || 0), 0);
    const totalVAT = transactions.reduce((sum, txn) => sum + (Number(txn.vatAmount) || 0), 0);

    return {
      period: { year, quarter },
      totalRevenue,
      totalVAT,
      transactionCount: transactions.length,
      insights: [
        `Quarter ${quarter} revenue: €${totalRevenue.toFixed(2)}`,
        `VAT collected: €${totalVAT.toFixed(2)}`,
      ],
    };
  }

  validateInvoiceCompliance(invoice = {}) {
    const errors = [];
    const numberPattern = /^INV-\d{4}-\d{3}$/;

    const invoiceNumber = invoice.invoiceNumber;
    if (!invoiceNumber || !numberPattern.test(invoiceNumber)) {
      errors.push('Invoice number must follow INV-YYYY-NNN format');
    }

    if (!invoice.date) {
      errors.push('Issue date is required');
    }

    if (invoice.total === null && invoice.amount === null) {
      errors.push('Invoice total is required');
    }
    if (!invoice.clientName) {
      errors.push('Client name is required');
    }

    const { Invoice } = require('../models');
    const missingModelFields = ['clientAddress', 'vatAmount'].filter(
      field => !(Invoice && Invoice.rawAttributes && Invoice.rawAttributes[field]),
    );
    if (missingModelFields.length) {
      errors.push(`Invoice model missing fields needed for compliance checks: ${missingModelFields.join(', ')}`);
    }

    return {
      isCompliant: errors.length === 0,
      errors,
    };
  }
}

module.exports = new GermanTaxCompliance();
