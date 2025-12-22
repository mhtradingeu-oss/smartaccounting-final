
class GermanTaxEngine {
  constructor() {
    this.taxRates = {
      standardVAT: 0.19,    // 19% standard VAT
      reducedVAT: 0.07,     // 7% reduced VAT
      kleinunternehmer: 0,  // Kleinunternehmerregelung - no VAT
    };
    
    this.thresholds = {
      kleinunternehmer: 22000,  // €22,000 threshold for Kleinunternehmerregelung
      gewerbesteuer: 24500,     // €24,500 Gewerbesteuer threshold
      umsatzsteuer: 50000,       // €50,000 VAT registration threshold
    };
  }

  // Calculate VAT based on German regulations
  calculateVAT(netAmount, vatType = 'standard', isKleinunternehmer = false) {
    if (isKleinunternehmer) {return 0;}
    
    const rate = vatType === 'reduced' ? this.taxRates.reducedVAT : this.taxRates.standardVAT;
    return Math.round((netAmount * rate) * 100) / 100;
  }

  // Generate Umsatzsteuervoranmeldung (VAT advance return)
  async generateUStVA(companyId, year, quarter) {
    const startDate = new Date(year, (quarter - 1) * 3, 1);
    const endDate = new Date(year, quarter * 3, 0);

    const transactions = await this.getTransactions(companyId, startDate, endDate);
    
    const vatReport = {
      reportType: 'UStVA',
      period: `${year}-Q${quarter}`,
      companyId,
      generatedAt: new Date().toISOString(),
      
      // Output VAT (VAT on sales)
      outputVAT: {
        standardRate: this.sumVATByRate(transactions.sales, 'standard'),
        reducedRate: this.sumVATByRate(transactions.sales, 'reduced'),
        total: 0,
      },
      
      // Input VAT (VAT on purchases)
      inputVAT: {
        standardRate: this.sumVATByRate(transactions.purchases, 'standard'),
        reducedRate: this.sumVATByRate(transactions.purchases, 'reduced'),
        total: 0,
      },
      
      // Net VAT liability
      netVATLiability: 0,
      
      // Special cases
      innerEUDeliveries: 0,
      thirdCountryDeliveries: 0,
      innerEUAcquisitions: 0,
    };

    vatReport.outputVAT.total = vatReport.outputVAT.standardRate + vatReport.outputVAT.reducedRate;
    vatReport.inputVAT.total = vatReport.inputVAT.standardRate + vatReport.inputVAT.reducedRate;
    vatReport.netVATLiability = vatReport.outputVAT.total - vatReport.inputVAT.total;

    return vatReport;
  }

  // Generate EÜR (Einnahmen-Überschuss-Rechnung)
  async generateEUR(companyId, year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const transactions = await this.getTransactions(companyId, startDate, endDate);
    
    return {
      reportType: 'EÜR',
      year,
      companyId,
      generatedAt: new Date().toISOString(),
      
      // Income categories
      income: {
        operatingIncome: this.categorizeIncome(transactions.income, 'operating'),
        otherIncome: this.categorizeIncome(transactions.income, 'other'),
        total: 0,
      },
      
      // Expense categories
      expenses: {
        materialCosts: this.categorizeExpenses(transactions.expenses, 'materials'),
        personnelCosts: this.categorizeExpenses(transactions.expenses, 'personnel'),
        rent: this.categorizeExpenses(transactions.expenses, 'rent'),
        utilities: this.categorizeExpenses(transactions.expenses, 'utilities'),
        insurance: this.categorizeExpenses(transactions.expenses, 'insurance'),
        professionalServices: this.categorizeExpenses(transactions.expenses, 'professional'),
        depreciation: this.categorizeExpenses(transactions.expenses, 'depreciation'),
        other: this.categorizeExpenses(transactions.expenses, 'other'),
        total: 0,
      },
      
      // Profit calculation
      profit: 0,
      
      // Tax estimates
      estimatedIncomeTax: 0,
      estimatedTradeTax: 0,
      estimatedSocialSecurity: 0,
    };
  }

  // Check compliance with German tax regulations
  async checkTaxCompliance(companyId, year) {
    const revenue = await this.getAnnualRevenue(companyId, year);
    const compliance = {
      isCompliant: true,
      warnings: [],
      requirements: [],
    };

    // Check Kleinunternehmerregelung eligibility
    if (revenue <= this.thresholds.kleinunternehmer) {
      compliance.requirements.push({
        type: 'kleinunternehmer_eligible',
        message: 'Company is eligible for Kleinunternehmerregelung (small business scheme)',
        action: 'Consider opting for VAT exemption',
      });
    }

    // Check VAT registration requirement
    if (revenue > this.thresholds.umsatzsteuer) {
      compliance.requirements.push({
        type: 'vat_registration_required',
        message: 'VAT registration is mandatory',
        action: 'Ensure VAT registration is current',
      });
    }

    // Check trade tax liability
    if (revenue > this.thresholds.gewerbesteuer) {
      compliance.requirements.push({
        type: 'trade_tax_liable',
        message: 'Company may be liable for trade tax (Gewerbesteuer)',
        action: 'Calculate and prepare trade tax return',
      });
    }

    return compliance;
  }

  // Generate tax calendar with deadlines
  generateTaxCalendar(year) {
    return {
      year,
      deadlines: [
        {
          date: `${year}-01-10`,
          type: 'UStVA',
          description: 'VAT advance return Q4 previous year',
          penalty: 'Late filing penalty applies',
        },
        {
          date: `${year}-02-10`,
          type: 'UStVA',
          description: 'VAT advance return January',
          penalty: 'Late filing penalty applies',
        },
        {
          date: `${year}-05-31`,
          type: 'Income Tax',
          description: 'Income tax return deadline',
          penalty: 'Late filing penalty and interest',
        },
        {
          date: `${year}-07-31`,
          type: 'Trade Tax',
          description: 'Trade tax return deadline',
          penalty: 'Late filing penalty applies',
        },
      ],
    };
  }

  async getTransactions(_companyId, _startDate, _endDate) {
    // Implementation would fetch from database
    // This is a placeholder structure
    return {
      sales: [],
      purchases: [],
      income: [],
      expenses: [],
    };
  }

  sumVATByRate(transactions, rate) {
    return transactions
      .filter(t => t.vatRate === rate)
      .reduce((sum, t) => sum + (t.vatAmount || 0), 0);
  }

  categorizeIncome(transactions, category) {
    return transactions
      .filter(t => t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  categorizeExpenses(transactions, category) {
    return transactions
      .filter(t => t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  async getAnnualRevenue(_companyId, _year) {
    // Implementation would calculate from database
    return 0;
  }
}

module.exports = new GermanTaxEngine();
