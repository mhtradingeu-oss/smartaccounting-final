const { sequelize } = require('../models');

class TaxAccountingEngine {
  constructor() {
    
    this.skr03Accounts = {
      
      revenue: {
        domestic: '8400', 
        domesticReduced: '8300', 
        export: '8100', 
        eu: '8110', 
        services: '8500', 
      },

      expenses: {
        materials: '5000', 
        wages: '6200', 
        socialSecurity: '6210', 
        rent: '6300', 
        utilities: '6400', 
        insurance: '6500', 
        travel: '6600', 
        office: '6800', 
        marketing: '6900', 
        depreciation: '6200', 
      },

      vat: {
        inputTax: '1400', 
        inputTaxReduced: '1401', 
        outputTax: '1771', 
        outputTaxReduced: '1773', 
        vatPayable: '1780', 
      },

      assets: {
        cash: '1000', 
        bank: '1200', 
        receivables: '1400', 
        inventory: '3000', 
        equipment: '0600', 
        buildings: '0200', 
      },
    };

    this.taxRates = {
      vat: {
        standard: 0.19, 
        reduced: 0.07, 
        zero: 0.00, 
      },
      corporateTax: 0.15, 
      solidarityTax: 0.055, 
      tradeEarningsTax: 0.035, 
    };
  }

  async classifyInvoice(invoice) {
    try {
      const classification = {
        invoiceId: invoice.id,
        accountCode: null,
        vatAccount: null,
        vatRate: null,
        isDeductible: false,
        description: '',
        bookingEntries: [],
      };

      if (invoice.type === 'income') {
        classification.accountCode = this.classifyRevenue(invoice);
        classification.vatAccount = this.getVATOutputAccount(invoice.vatRate);
      } else {
        classification.accountCode = this.classifyExpense(invoice);
        classification.vatAccount = this.getVATInputAccount(invoice.vatRate);
        classification.isDeductible = this.isVATDeductible(invoice);
      }

      classification.vatRate = invoice.vatRate || this.taxRates.vat.standard;
      classification.description = this.generateBookingDescription(invoice);
      classification.bookingEntries = this.generateBookingEntries(invoice, classification);

      return classification;
    } catch (error) {
      throw new Error('Failed to classify invoice for German tax system');
    }
  }

  classifyRevenue(invoice) {
    if (invoice.isExport) {
      return this.skr03Accounts.revenue.export;
    }

    if (invoice.isEUDelivery) {
      return this.skr03Accounts.revenue.eu;
    }

    if (invoice.vatRate === this.taxRates.vat.reduced) {
      return this.skr03Accounts.revenue.domesticReduced;
    }

    return this.skr03Accounts.revenue.domestic;
  }

  classifyExpense(invoice) {
    const description = (invoice.description || '').toLowerCase();

    if (description.includes('miete') || description.includes('rent')) {
      return this.skr03Accounts.expenses.rent;
    }

    if (description.includes('strom') || description.includes('gas') || description.includes('wasser')) {
      return this.skr03Accounts.expenses.utilities;
    }

    if (description.includes('versicherung') || description.includes('insurance')) {
      return this.skr03Accounts.expenses.insurance;
    }

    if (description.includes('reise') || description.includes('travel')) {
      return this.skr03Accounts.expenses.travel;
    }

    if (description.includes('büro') || description.includes('office')) {
      return this.skr03Accounts.expenses.office;
    }

    if (description.includes('marketing') || description.includes('werbung')) {
      return this.skr03Accounts.expenses.marketing;
    }

    return this.skr03Accounts.expenses.office;
  }

  generateBookingEntries(invoice, classification) {
    const entries = [];
    const netAmount = invoice.amount - invoice.vatAmount;
    const vatAmount = invoice.vatAmount;

    if (invoice.type === 'income') {
      
      entries.push({
        account: this.skr03Accounts.assets.receivables,
        debit: invoice.amount,
        credit: 0,
        description: `Rechnung ${invoice.number} - ${invoice.supplierName}`,
      });

      entries.push({
        account: classification.accountCode,
        debit: 0,
        credit: netAmount,
        description: `Umsatz ${invoice.number}`,
      });

      if (vatAmount > 0) {
        entries.push({
          account: classification.vatAccount,
          debit: 0,
          credit: vatAmount,
          description: `USt ${invoice.number}`,
        });
      }
    } else {
      
      entries.push({
        account: this.skr03Accounts.assets.bank,
        debit: 0,
        credit: invoice.amount,
        description: `Zahlung ${invoice.number} - ${invoice.supplierName}`,
      });

      entries.push({
        account: classification.accountCode,
        debit: netAmount,
        credit: 0,
        description: `Aufwand ${invoice.number}`,
      });

      if (vatAmount > 0 && classification.isDeductible) {
        entries.push({
          account: classification.vatAccount,
          debit: vatAmount,
          credit: 0,
          description: `Vorsteuer ${invoice.number}`,
        });
      }
    }

    return entries;
  }

  getVATOutputAccount(vatRate) {
    if (vatRate === this.taxRates.vat.reduced) {
      return this.skr03Accounts.vat.outputTaxReduced;
    }
    return this.skr03Accounts.vat.outputTax;
  }

  getVATInputAccount(vatRate) {
    if (vatRate === this.taxRates.vat.reduced) {
      return this.skr03Accounts.vat.inputTaxReduced;
    }
    return this.skr03Accounts.vat.inputTax;
  }

  isVATDeductible(invoice) {
    
    const nonDeductibleCategories = ['entertainment', 'personal', 'luxury'];
    const description = (invoice.description || '').toLowerCase();

    return !nonDeductibleCategories.some(cat => description.includes(cat));
  }

  generateBookingDescription(invoice) {
    const date = new Date(invoice.date).toLocaleDateString('de-DE');
    return `${invoice.type === 'income' ? 'Rechnung' : 'Eingangsrechnung'} ${invoice.number} vom ${date} - ${invoice.supplierName}`;
  }

  async calculateVATSummary(companyId, periodStart, periodEnd) {
    try {
      const query = `
        SELECT 
          SUM(CASE WHEN type = 'income' AND vat_rate = 0.19 THEN vat_amount ELSE 0 END) as output_vat_standard,
          SUM(CASE WHEN type = 'income' AND vat_rate = 0.07 THEN vat_amount ELSE 0 END) as output_vat_reduced,
          SUM(CASE WHEN type = 'expense' AND vat_rate = 0.19 THEN vat_amount ELSE 0 END) as input_vat_standard,
          SUM(CASE WHEN type = 'expense' AND vat_rate = 0.07 THEN vat_amount ELSE 0 END) as input_vat_reduced,
          SUM(CASE WHEN type = 'income' THEN amount - vat_amount ELSE 0 END) as total_revenue,
          SUM(CASE WHEN type = 'expense' THEN amount - vat_amount ELSE 0 END) as total_expenses
        FROM invoices 
        WHERE company_id = :companyId 
        AND date BETWEEN :periodStart AND :periodEnd
        AND status = 'processed'
      `;

      const [results] = await sequelize.query(query, {
        replacements: { companyId, periodStart, periodEnd },
        type: sequelize.QueryTypes.SELECT,
      });

      const vatSummary = {
        period: { start: periodStart, end: periodEnd },
        outputVAT: {
          standard: parseFloat(results.output_vat_standard || 0),
          reduced: parseFloat(results.output_vat_reduced || 0),
          total: parseFloat(results.output_vat_standard || 0) + parseFloat(results.output_vat_reduced || 0),
        },
        inputVAT: {
          standard: parseFloat(results.input_vat_standard || 0),
          reduced: parseFloat(results.input_vat_reduced || 0),
          total: parseFloat(results.input_vat_standard || 0) + parseFloat(results.input_vat_reduced || 0),
        },
        revenue: {
          net: parseFloat(results.total_revenue || 0),
          gross: parseFloat(results.total_revenue || 0) + parseFloat(results.output_vat_standard || 0) + parseFloat(results.output_vat_reduced || 0),
        },
        expenses: {
          net: parseFloat(results.total_expenses || 0),
          gross: parseFloat(results.total_expenses || 0) + parseFloat(results.input_vat_standard || 0) + parseFloat(results.input_vat_reduced || 0),
        },
      };

      vatSummary.vatPayable = vatSummary.outputVAT.total - vatSummary.inputVAT.total;
      vatSummary.netProfit = vatSummary.revenue.net - vatSummary.expenses.net;

      return vatSummary;
    } catch (error) {
      throw new Error('Failed to calculate VAT summary');
    }
  }

  async calculateIncomeTaxEstimate(companyId, periodStart, periodEnd) {
    try {
      const vatSummary = await this.calculateVATSummary(companyId, periodStart, periodEnd);
      const taxableIncome = vatSummary.netProfit;

      const corporateTax = taxableIncome * this.taxRates.corporateTax;
      const solidarityTax = corporateTax * this.taxRates.solidarityTax;
      const tradeEarningsTax = taxableIncome * this.taxRates.tradeEarningsTax;

      return {
        period: { start: periodStart, end: periodEnd },
        taxableIncome,
        corporateTax,
        solidarityTax,
        tradeEarningsTax,
        totalTax: corporateTax + solidarityTax + tradeEarningsTax,
        effectiveTaxRate: taxableIncome > 0 ? ((corporateTax + solidarityTax + tradeEarningsTax) / taxableIncome) : 0,
      };
    } catch (error) {
      throw new Error('Failed to calculate income tax estimate');
    }
  }

  async generateComplianceReport(companyId, year) {
    try {
      const periodStart = `${year}-01-01`;
      const periodEnd = `${year}-12-31`;

      const vatSummary = await this.calculateVATSummary(companyId, periodStart, periodEnd);
      const incomeTaxEstimate = await this.calculateIncomeTaxEstimate(companyId, periodStart, periodEnd);

      const monthlyPromises = Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
        const monthEnd = new Date(year, month, 0).toISOString().split('T')[0];
        const monthName = new Date(year, month - 1).toLocaleDateString('de-DE', {
          month: 'long',
        });

        return this.calculateVATSummary(companyId, monthStart, monthEnd).then(monthlyVAT => ({
          month,
          monthName,
          ...monthlyVAT,
        }));
      });

      const monthlyReports = await Promise.all(monthlyPromises);

      return {
        companyId,
        year,
        annual: {
          vat: vatSummary,
          incomeTax: incomeTaxEstimate,
        },
        monthly: monthlyReports,
        compliance: {
          vatDeclarationDue: `${year + 1}-05-31`, 
          corporateTaxDue: `${year + 1}-05-31`, 
          nextMonthlyVATDue: this.getNextVATDueDate(),
        },
        warnings: this.generateComplianceWarnings(vatSummary, incomeTaxEstimate),
      };
    } catch (error) {
      throw new Error('Failed to generate German tax compliance report');
    }
  }

  getNextVATDueDate() {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 10);
    return nextMonth.toISOString().split('T')[0];
  }

  generateComplianceWarnings(vatSummary, incomeTaxEstimate) {
    const warnings = [];

    if (vatSummary.vatPayable > 1000) {
      warnings.push({
        type: 'high_vat_liability',
        message: 'Hohe USt-Zahllast - Voranmeldung prüfen',
        amount: vatSummary.vatPayable,
      });
    }

    if (incomeTaxEstimate.totalTax > 5000) {
      warnings.push({
        type: 'quarterly_tax_payment',
        message: 'Vierteljährliche Steuervorauszahlung erforderlich',
        amount: incomeTaxEstimate.totalTax,
      });
    }

    if (vatSummary.revenue.gross > 50000) {
      warnings.push({
        type: 'vat_registration_check',
        message: 'USt-Registrierung bei Überschreitung der Kleinunternehmergrenze prüfen',
      });
    }

    return warnings;
  }
}

module.exports = new TaxAccountingEngine();
