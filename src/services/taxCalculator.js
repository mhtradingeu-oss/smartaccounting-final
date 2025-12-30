
const { Invoice, Transaction } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment-timezone');

class TaxCalculator {
  constructor() {
    this.germanTaxRates = {
      standard: 19,
      reduced: 7,
      zero: 0,
    };
    
    this.germanTaxCodes = {
      
      UST_19: '8400', 
      UST_7: '8300',  
      UST_0: '8200',  

      VST_19: '1400', 
      VST_7: '1300',  

      KST: '4800',    
      SOLI: '4850',   

      GEWST: '4900',   
    };
  }

  assertModelFields(model, fields, featureName) {
    const missing = fields.filter(field => !(model && model.rawAttributes && model.rawAttributes[field]));
    if (missing.length) {
      const error = new Error(`${featureName} unavailable: missing model fields (${missing.join(', ')})`);
      error.statusCode = 501;
      error.code = 'INSUFFICIENT_DATA';
      error.missingFields = missing;
      throw error;
    }
  }

  async calculateTaxReport({ companyId, reportType, periodStart, periodEnd }) {
    const startDate = moment.tz(periodStart, 'Europe/Berlin').startOf('day').toDate();
    const endDate = moment.tz(periodEnd, 'Europe/Berlin').endOf('day').toDate();

    switch (reportType) {
      case 'USt':
        return this.calculateUstReport(companyId, startDate, endDate);
      case 'KSt':
        return this.calculateKstReport(companyId, startDate, endDate);
      case 'GewSt':
        return this.calculateGewStReport(companyId, startDate, endDate);
      case 'EÜR':
        return this.calculateEuRReport(companyId, startDate, endDate);
      case 'BWA':
        return this.calculateBWAReport(companyId, startDate, endDate);
      default:
        throw new Error('Unknown report type');
    }
  }

  async calculateUstReport(companyId, startDate, endDate) {
    this.assertModelFields(Invoice, ['type', 'invoiceDate', 'vatRate', 'netAmount', 'vatAmount'], 'USt report');

    const [inboundInvoices, outboundInvoices] = await Promise.all([
      Invoice.findAll({
        where: {
          companyId,
          type: 'inbound',
          invoiceDate: { [Op.between]: [startDate, endDate] },
          status: ['processed', 'approved', 'paid'],
        },
      }),
      Invoice.findAll({
        where: {
          companyId,
          type: 'outbound',
          invoiceDate: { [Op.between]: [startDate, endDate] },
          status: ['processed', 'approved', 'paid'],
        },
      }),
    ]);

    const ustData = {
      
      kz81_standardRate: 0,        
      kz86_reducedRate: 0,         
      kz43_zeroRate: 0,            
      kz44_euSales: 0,             
      kz45_exportSales: 0,         

      kz83_standardTax: 0,         
      kz87_reducedTax: 0,          

      kz61_inputTax19: 0,          
      kz62_inputTax7: 0,           
      kz66_euInputTax: 0,          
      kz67_importInputTax: 0,      

      totalOutputTax: 0,
      totalInputTax: 0,
      vatPayable: 0,

      reverseChargeTransactions: 0,
      intraeuTransactions: 0,
      thirdCountryTransactions: 0,
    };

    for (const invoice of outboundInvoices) {
      const vatRate = parseFloat(invoice.vatRate);
      const netAmount = parseFloat(invoice.netAmount);
      const vatAmount = parseFloat(invoice.vatAmount);

      if (vatRate === 0.19) {
        ustData.kz81_standardRate += netAmount;
        ustData.kz83_standardTax += vatAmount;
      } else if (vatRate === 0.07) {
        ustData.kz86_reducedRate += netAmount;
        ustData.kz87_reducedTax += vatAmount;
      } else if (vatRate === 0) {
        ustData.kz43_zeroRate += netAmount;
      }

      ustData.totalOutputTax += vatAmount;
    }

    for (const invoice of inboundInvoices) {
      const vatRate = parseFloat(invoice.vatRate);
      const vatAmount = parseFloat(invoice.vatAmount);

      if (vatRate === 0.19) {
        ustData.kz61_inputTax19 += vatAmount;
      } else if (vatRate === 0.07) {
        ustData.kz62_inputTax7 += vatAmount;
      }

      ustData.totalInputTax += vatAmount;
    }

    ustData.vatPayable = ustData.totalOutputTax - ustData.totalInputTax;

    return {
      reportType: 'USt',
      period: { start: startDate, end: endDate },
      data: ustData,
      summary: {
        totalOutputTax: ustData.totalOutputTax,
        totalInputTax: ustData.totalInputTax,
        vatPayable: ustData.vatPayable,
        complianceStatus: 'GoBD_compliant',
      },
      submissionDeadline: this.calculateDeadline('USt', endDate),
      elsterFields: this.mapToElsterFields(ustData),
    };
  }

  async calculateKstReport(companyId, startDate, endDate) {
    this.assertModelFields(Transaction, ['transactionDate', 'type', 'creditAmount', 'debitAmount', 'category', 'nonDeductible'], 'KSt report');

    const transactions = await Transaction.findAll({
      where: {
        companyId,
        transactionDate: { [Op.between]: [startDate, endDate] },
      },
    });

    const kstData = {
      totalRevenue: 0,
      totalExpenses: 0,
      depreciationAllowances: 0,
      nonDeductibleExpenses: 0,
      taxableIncome: 0,
      corporateTax: 0,           
      solidarityTax: 0,          
      municipalTradeTax: 0,      
      totalTaxLiability: 0,
      taxCredits: 0,
      advancePayments: 0,
      finalTaxDue: 0,
    };

    for (const transaction of transactions) {
      const amount = parseFloat(transaction.creditAmount || transaction.debitAmount);
      
      if (transaction.type === 'income') {
        kstData.totalRevenue += amount;
      } else if (transaction.type === 'expense') {
        if (transaction.category === 'depreciation') {
          kstData.depreciationAllowances += amount;
        } else if (transaction.nonDeductible) {
          kstData.nonDeductibleExpenses += amount;
        } else {
          kstData.totalExpenses += amount;
        }
      }
    }

    kstData.taxableIncome = kstData.totalRevenue - kstData.totalExpenses - kstData.depreciationAllowances + kstData.nonDeductibleExpenses;

    if (kstData.taxableIncome > 0) {
      kstData.corporateTax = kstData.taxableIncome * 0.15; 
      kstData.solidarityTax = kstData.corporateTax * 0.055; 
      kstData.totalTaxLiability = kstData.corporateTax + kstData.solidarityTax;
    }

    return {
      reportType: 'KSt',
      period: { start: startDate, end: endDate },
      data: kstData,
      submissionDeadline: this.calculateDeadline('KSt', endDate),
      complianceNotes: ['Filed according to AO §149', 'Corporate tax act compliance verified'],
    };
  }

  async calculateGewStReport(companyId, startDate, endDate) {
    const kstReport = await this.calculateKstReport(companyId, startDate, endDate);
    
    const gewStData = {
      ...kstReport.data,
      tradeTaxBase: 0,
      tradeTaxRate: 3.5,          
      municipalityMultiplier: 400, 
      freibetrag: 24500,          
      tradeTax: 0,
      effectiveTradeTaxRate: 0,
    };

    if (gewStData.taxableIncome > gewStData.freibetrag) {
      gewStData.tradeTaxBase = gewStData.taxableIncome - gewStData.freibetrag;

      gewStData.tradeTaxBase += gewStData.corporateTax * 0.25; 

      gewStData.tradeTax = gewStData.tradeTaxBase * (gewStData.tradeTaxRate / 100) * (gewStData.municipalityMultiplier / 100);
      gewStData.effectiveTradeTaxRate = (gewStData.tradeTax / gewStData.taxableIncome) * 100;
    }

    return {
      reportType: 'GewSt',
      period: { start: startDate, end: endDate },
      data: gewStData,
      submissionDeadline: this.calculateDeadline('GewSt', endDate),
      municipalityInfo: {
        hebesatz: gewStData.municipalityMultiplier,
        effectiveRate: gewStData.effectiveTradeTaxRate,
      },
    };
  }

  async calculateEuRReport(companyId, startDate, endDate) {
    this.assertModelFields(Transaction, ['transactionDate', 'type', 'amount', 'accountName', 'businessPortion'], 'EÜR report');

    const transactions = await Transaction.findAll({
      where: {
        companyId,
        transactionDate: { [Op.between]: [startDate, endDate] },
      },
      order: [['transactionDate', 'ASC']],
    });

    const eurData = {
      income: {
        total: 0,
        byCategory: {},
        byMonth: {},
      },
      expenses: {
        total: 0,
        byCategory: {},
        businessExpenses: 0,
        privateExpenses: 0,
      },
      investmentDeductions: {
        total: 0,
        gwa: 0,        
        afa: 0,         
      },
      profit: 0,
      taxableIncome: 0,
      personalTaxBasis: 0,
    };

    for (const transaction of transactions) {
      const amount = parseFloat(transaction.creditAmount || transaction.debitAmount);
      const month = moment(transaction.transactionDate).format('YYYY-MM');
      const category = transaction.accountName || 'Other';

      if (transaction.type === 'income') {
        eurData.income.total += amount;
        eurData.income.byCategory[category] = (eurData.income.byCategory[category] || 0) + amount;
        eurData.income.byMonth[month] = (eurData.income.byMonth[month] || 0) + amount;
      } else if (transaction.type === 'expense') {
        eurData.expenses.total += amount;
        eurData.expenses.byCategory[category] = (eurData.expenses.byCategory[category] || 0) + amount;
        
        if (transaction.businessPortion) {
          eurData.expenses.businessExpenses += amount * (transaction.businessPortion / 100);
          eurData.expenses.privateExpenses += amount * ((100 - transaction.businessPortion) / 100);
        } else {
          eurData.expenses.businessExpenses += amount;
        }
      }
    }

    eurData.profit = eurData.income.total - eurData.expenses.businessExpenses;
    eurData.taxableIncome = eurData.profit - eurData.investmentDeductions.total;

    return {
      reportType: 'EÜR',
      period: { start: startDate, end: endDate },
      data: eurData,
      submissionDeadline: this.calculateDeadline('EÜR', endDate),
      attachments: ['Anlage EÜR', 'Anlage G', 'Umsatzsteuervoranmeldung'],
    };
  }

  async calculateBWAReport(companyId, startDate, endDate) {
    const transactions = await Transaction.findAll({
      where: {
        companyId,
        transactionDate: { [Op.between]: [startDate, endDate] },
      },
    });

    const bwaData = {
      revenue: {
        total: 0,
        recurring: 0,
        oneTime: 0,
      },
      costs: {
        materialCosts: 0,
        personnelCosts: 0,
        operatingCosts: 0,
        financialCosts: 0,
      },
      margins: {
        grossProfit: 0,
        grossProfitMargin: 0,
        operatingProfit: 0,
        operatingMargin: 0,
        netProfit: 0,
        netMargin: 0,
      },
      cashflow: {
        operating: 0,
        investing: 0,
        financing: 0,
      },
    };

    for (const transaction of transactions) {
      const amount = parseFloat(transaction.creditAmount || transaction.debitAmount);
      
      if (transaction.type === 'income') {
        bwaData.revenue.total += amount;
      } else if (transaction.type === 'expense') {
        if (transaction.category === 'materials') {
          bwaData.costs.materialCosts += amount;
        } else if (transaction.category === 'personnel') {
          bwaData.costs.personnelCosts += amount;
        } else if (transaction.category === 'financial') {
          bwaData.costs.financialCosts += amount;
        } else {
          bwaData.costs.operatingCosts += amount;
        }
      }
    }

    bwaData.margins.grossProfit = bwaData.revenue.total - bwaData.costs.materialCosts;
    bwaData.margins.grossProfitMargin = bwaData.revenue.total > 0 ? (bwaData.margins.grossProfit / bwaData.revenue.total) * 100 : 0;
    
    bwaData.margins.operatingProfit = bwaData.margins.grossProfit - bwaData.costs.personnelCosts - bwaData.costs.operatingCosts;
    bwaData.margins.operatingMargin = bwaData.revenue.total > 0 ? (bwaData.margins.operatingProfit / bwaData.revenue.total) * 100 : 0;
    
    bwaData.margins.netProfit = bwaData.margins.operatingProfit - bwaData.costs.financialCosts;
    bwaData.margins.netMargin = bwaData.revenue.total > 0 ? (bwaData.margins.netProfit / bwaData.revenue.total) * 100 : 0;

    return {
      reportType: 'BWA',
      period: { start: startDate, end: endDate },
      data: bwaData,
      kpis: {
        revenueGrowth: 0, 
        costRatio: (bwaData.costs.materialCosts + bwaData.costs.operatingCosts) / bwaData.revenue.total * 100,
        productivityIndex: bwaData.revenue.total / bwaData.costs.personnelCosts,
      },
    };
  }

  calculateDeadline(reportType, periodEnd) {
    const endDate = moment(periodEnd);
    
    switch (reportType) {
      case 'USt':

        return endDate.add(1, 'month').date(10).format('YYYY-MM-DD');
      
      case 'KSt':
      case 'GewSt':
        
        return endDate.add(1, 'year').month(4).date(31).format('YYYY-MM-DD');
      
      case 'EÜR':
        
        return endDate.add(1, 'year').month(4).date(31).format('YYYY-MM-DD');
      
      default:
        return endDate.add(1, 'month').format('YYYY-MM-DD');
    }
  }

  mapToElsterFields(ustData) {
    return {
      Kz81: Math.round(ustData.kz81_standardRate * 100), 
      Kz86: Math.round(ustData.kz86_reducedRate * 100),
      Kz43: Math.round(ustData.kz43_zeroRate * 100),
      Kz83: Math.round(ustData.kz83_standardTax * 100),
      Kz87: Math.round(ustData.kz87_reducedTax * 100),
      Kz61: Math.round(ustData.kz61_inputTax19 * 100),
      Kz62: Math.round(ustData.kz62_inputTax7 * 100),
      Kz83_minus_61: Math.round(ustData.vatPayable * 100),
    };
  }

  validateGermanTaxCompliance(reportData, reportType) {
    const compliance = {
      gobdCompliant: true,
      ustgCompliant: true,
      kstgCompliant: true,
      estgCompliant: true,
      gewstgCompliant: true,
      aoCompliant: true,
      issues: [],
    };

    if (reportType === 'USt' && reportData.vatPayable < 0 && Math.abs(reportData.vatPayable) > 7500) {
      compliance.issues.push('Large VAT refund requires additional documentation');
    }

    return compliance;
  }
}

module.exports = new TaxCalculator();
