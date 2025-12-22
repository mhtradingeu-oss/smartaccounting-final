
const moment = require('moment');

class GermanTaxUtils {
  static vatRates = {
    standard: 0.19,
    reduced: 0.07,
    zero: 0.00,
  };

  static taxThresholds = {
    kleinunternehmer: 22000,
    gewerbesteuer: 24500,
    vatRegistration: 50000,
  };

  static skr03Accounts = {
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
      rent: '6300',
      utilities: '6400',
      insurance: '6500',
      travel: '6600',
      office: '6800',
      marketing: '6900',
    },
    vat: {
      inputTax: '1400',
      outputTax: '1771',
      vatPayable: '1780',
    },
  };

  static calculateVAT(netAmount, vatType = 'standard') {
    const rate = this.vatRates[vatType] || this.vatRates.standard;
    return Math.round((netAmount * rate) * 100) / 100;
  }

  static calculateIncomeTax(income) {
    if (income <= 10347) {return 0;} // Tax-free allowance 2024
    if (income <= 14926) {return income * 0.14;}
    if (income <= 58596) {return income * 0.24;}
    if (income <= 277825) {return income * 0.42;}
    return income * 0.45;
  }

  static calculateTradeTax(income) {
    const basicAmount = Math.max(0, income - 24500);
    return basicAmount * 0.035 * 3.5;
  }

  static calculateSocialSecurity(income) {
    return Math.min(income * 0.196, 4987.50 * 12);
  }

  static isKleinunternehmerEligible(currentRevenue, previousRevenue) {
    return previousRevenue <= 17500 && currentRevenue <= this.taxThresholds.kleinunternehmer;
  }

  static getVATDeadline(periodEnd) {
    return moment(periodEnd).add(1, 'month').date(10).format('YYYY-MM-DD');
  }

  static getIncomeTaxDeadline(year) {
    return `${year + 1}-05-31`;
  }

  static categorizeGermanExpense(description) {
    const desc = description.toLowerCase();
    
    if (desc.includes('miete') || desc.includes('rent')) {return 'rent';}
    if (desc.includes('strom') || desc.includes('gas') || desc.includes('wasser')) {return 'utilities';}
    if (desc.includes('versicherung')) {return 'insurance';}
    if (desc.includes('reise') || desc.includes('travel')) {return 'travel';}
    if (desc.includes('büro') || desc.includes('office')) {return 'office';}
    if (desc.includes('marketing') || desc.includes('werbung')) {return 'marketing';}
    if (desc.includes('gehalt') || desc.includes('lohn')) {return 'wages';}
    
    return 'other';
  }

  static isTaxDeductible(category, description = '') {
    const deductibleCategories = [
      'office', 'marketing', 'travel', 'training',
      'professional', 'software', 'equipment',
      'rent', 'utilities', 'insurance', 'wages',
    ];
    
    const nonDeductible = description.toLowerCase();
    if (nonDeductible.includes('entertainment') || 
        nonDeductible.includes('personal') || 
        nonDeductible.includes('luxury')) {
      return false;
    }
    
    return deductibleCategories.includes(category);
  }

  static formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  static parseGermanAmount(amountString) {
    if (typeof amountString === 'number') {return amountString;}
    
    const cleaned = amountString
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '');
    
    return parseFloat(cleaned) || 0;
  }

  static generateElsterFields(vatData) {
    return {
      Kz81: Math.round(vatData.standardRate * 100),
      Kz86: Math.round(vatData.reducedRate * 100),
      Kz83: Math.round(vatData.standardTax * 100),
      Kz87: Math.round(vatData.reducedTax * 100),
      Kz66: Math.round(vatData.inputVat * 100),
    };
  }
}

module.exports = GermanTaxUtils;
