const { Invoice, User, Transaction, TaxReport, Expense, BankTransaction } = require('../models');
const logger = require('../lib/logger');

// Import Op for Sequelize operations
const { Op } = require('sequelize');

class DashboardService {
  static missingFields(model, fields) {
    if (!model || !model.rawAttributes) {
      return fields;
    }
    return fields.filter(field => !model.rawAttributes[field]);
  }

  /**
   * Get comprehensive dashboard statistics
   */
  static async getStats(companyId) {
    try {
      const missingInvoiceFields = this.missingFields(Invoice, ['total', 'status', 'dueDate']);
      const missingUserFields = this.missingFields(User, ['companyId', 'isActive']);
      if (missingInvoiceFields.length || missingUserFields.length) {
        return {
          status: 'unavailable',
          reason: 'insufficient_data',
          missingFields: {
            Invoice: missingInvoiceFields,
            User: missingUserFields,
          },
        };
      }

      const missingExpenseFields = this.missingFields(Expense, ['grossAmount', 'companyId']);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const startOfPrevQuarter = new Date(
        now.getFullYear(),
        currentQuarter * 3 - 3,
        1,
      );
      const endOfPrevQuarter = new Date(now.getFullYear(), currentQuarter * 3, 0);

      const [
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalRevenue,
        monthlyRevenue,
        previousMonthRevenue,
        quarterlyRevenue,
        previousQuarterRevenue,
        totalUsers,
        activeUsers,
        totalExpenses,
        bankTransactions,
      ] = await Promise.all([
        Invoice.count({ where: { companyId } }),
        Invoice.count({ where: { companyId, status: 'PAID' } }),
        Invoice.count({
          where: { companyId, status: { [Op.in]: ['SENT', 'PARTIALLY_PAID'] } },
        }),
        Invoice.count({
          where: { 
            companyId, 
            status: 'OVERDUE',
            dueDate: { [Op.lt]: new Date() },
          }, 
        }),
        Invoice.sum('total', { 
          where: { companyId, status: 'PAID' }, 
        }) || 0,
        Invoice.sum('total', { 
          where: { 
            companyId, 
            status: 'PAID',
            createdAt: {
              [Op.gte]: startOfMonth,
            },
          }, 
        }) || 0,
        Invoice.sum('total', {
          where: {
            companyId,
            status: 'PAID',
            createdAt: {
              [Op.between]: [startOfPrevMonth, endOfPrevMonth],
            },
          },
        }) || 0,
        Invoice.sum('total', {
          where: {
            companyId,
            status: 'PAID',
            createdAt: {
              [Op.gte]: startOfQuarter,
            },
          },
        }) || 0,
        Invoice.sum('total', {
          where: {
            companyId,
            status: 'PAID',
            createdAt: {
              [Op.between]: [startOfPrevQuarter, endOfPrevQuarter],
            },
          },
        }) || 0,
        User.count({ where: { companyId } }),
        User.count({ where: { companyId, isActive: true } }),
        missingExpenseFields.length
          ? null
          : Expense.sum('grossAmount', { where: { companyId } }) || 0,
        BankTransaction
          ? BankTransaction.count({ where: { companyId } })
          : 0,
      ]);

      const revenueTotal = parseFloat(totalRevenue || 0);
      const expensesTotal =
        totalExpenses === null ? null : parseFloat(totalExpenses || 0);
      const netProfit =
        expensesTotal === null ? null : parseFloat(revenueTotal - expensesTotal);
      const profitMargin =
        netProfit === null || revenueTotal === 0
          ? null
          : parseFloat(((netProfit / revenueTotal) * 100).toFixed(2));
      const monthlyRevenueValue = parseFloat(monthlyRevenue || 0);
      const previousMonthRevenueValue = parseFloat(previousMonthRevenue || 0);
      const quarterlyRevenueValue = parseFloat(quarterlyRevenue || 0);
      const previousQuarterRevenueValue = parseFloat(previousQuarterRevenue || 0);
      const monthlyGrowth =
        previousMonthRevenueValue > 0
          ? ((monthlyRevenueValue - previousMonthRevenueValue) / previousMonthRevenueValue) * 100
          : monthlyRevenueValue > 0
            ? 100
            : 0;
      const quarterlyGrowth =
        previousQuarterRevenueValue > 0
          ? ((quarterlyRevenueValue - previousQuarterRevenueValue) / previousQuarterRevenueValue) * 100
          : quarterlyRevenueValue > 0
            ? 100
            : 0;

      return {
        totalRevenue: revenueTotal,
        totalExpenses: expensesTotal,
        netProfit,
        profitMargin,
        invoiceCount: totalInvoices,
        pendingInvoices,
        overdue: overdueInvoices,
        bankTransactions,
        monthlyGrowth: parseFloat(monthlyGrowth.toFixed(2)),
        quarterlyGrowth: parseFloat(quarterlyGrowth.toFixed(2)),
        averageInvoice:
          paidInvoices > 0 ? parseFloat((revenueTotal / paidInvoices).toFixed(2)) : 0,
        invoices: {
          total: totalInvoices,
          paid: paidInvoices,
          pending: pendingInvoices,
          overdue: overdueInvoices,
          paidPercentage: totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0,
        },
        revenue: {
          total: revenueTotal,
          monthly: monthlyRevenueValue,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          activePercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
        },
      };
    } catch (error) {
      logger.error('Dashboard stats error:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }

  /**
   * Get monthly data for charts
   */
  static async getMonthlyData(companyId) {
    try {
      const missingInvoiceFields = this.missingFields(Invoice, ['total', 'status', 'createdAt']);
      if (missingInvoiceFields.length) {
        return {
          status: 'unavailable',
          reason: 'insufficient_data',
          missingFields: { Invoice: missingInvoiceFields },
        };
      }

      const currentYear = new Date().getFullYear();

      const monthPromises = Array.from({ length: 12 }, (_, monthIndex) => {
        const startDate = new Date(currentYear, monthIndex, 1);
        const endDate = new Date(currentYear, monthIndex + 1, 0);
        return Promise.all([
          Invoice.sum('total', {
            where: {
              companyId,
              status: 'PAID',
              createdAt: {
                [Op.between]: [startDate, endDate],
              },
            },
          }) || 0,
          Invoice.count({
            where: {
              companyId,
              createdAt: {
                [Op.between]: [startDate, endDate],
              },
            },
          }),
        ]).then(([revenue, invoiceCount]) => ({
          month: startDate.toLocaleString('en-US', { month: 'short' }),
          revenue: parseFloat(revenue || 0),
          invoices: invoiceCount,
          date: startDate.toISOString(),
        }));
      });

      const monthlyData = await Promise.all(monthPromises);

      return monthlyData;
    } catch (error) {
      logger.error('Monthly data error:', error);
      throw new Error('Failed to fetch monthly data');
    }
  }

  /**
   * Get tax summary
   */
  static async getTaxSummary(companyId) {
    try {
      const missingTransactionFields = this.missingFields(Transaction, ['vatAmount', 'type', 'transactionDate']);
      if (missingTransactionFields.length) {
        return {
          status: 'unavailable',
          reason: 'insufficient_data',
          missingFields: { Transaction: missingTransactionFields },
        };
      }

      const currentYear = new Date().getFullYear();
      const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

      const [
        vatCollected,
        vatPaid,
        quarterlyReports,
        annualReports,
      ] = await Promise.all([
        Transaction.sum('vatAmount', {
          where: {
            companyId,
            type: 'income',
            transactionDate: {
              [Op.gte]: new Date(currentYear, 0, 1),
            },
          },
        }) || 0,
        Transaction.sum('vatAmount', {
          where: {
            companyId,
            type: 'expense',
            transactionDate: {
              [Op.gte]: new Date(currentYear, 0, 1),
            },
          },
        }) || 0,
        TaxReport.count({
          where: {
            companyId,
            reportType: 'quarterly',
            year: currentYear,
          },
        }),
        TaxReport.count({
          where: {
            companyId,
            reportType: 'annual',
            year: currentYear,
          },
        }),
      ]);

      return {
        vat: {
          collected: parseFloat(vatCollected || 0),
          paid: parseFloat(vatPaid || 0),
          net: parseFloat((vatCollected || 0) - (vatPaid || 0)),
          currency: 'EUR',
        },
        reports: {
          quarterly: {
            completed: quarterlyReports,
            total: 4,
            current: currentQuarter,
          },
          annual: {
            completed: annualReports,
            total: 1,
            current: 1,
          },
        },
        compliance: {
          status: quarterlyReports >= currentQuarter ? 'compliant' : 'pending',
          nextDueDate: this.getNextTaxDueDate(),
        },
      };
    } catch (error) {
      logger.error('Tax summary error:', error);
      throw new Error('Failed to fetch tax summary');
    }
  }

  /**
   * Get upload statistics
   */
  static async getUploadStats(companyId) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalUploads,
        recentUploads,
        processedUploads,
        failedUploads,
      ] = await Promise.all([
        Invoice.count({ where: { companyId } }),
        Invoice.count({ 
          where: { 
            companyId,
            createdAt: { [Op.gte]: thirtyDaysAgo },
          },
        }),
        Invoice.count({ 
          where: { 
            companyId,
            status: { [Op.in]: ['paid', 'pending'] },
          },
        }),
        Invoice.count({ 
          where: { 
            companyId,
            status: 'failed',
          },
        }),
      ]);

      return {
        total: totalUploads,
        recent: recentUploads,
        processed: processedUploads,
        failed: failedUploads,
        successRate: totalUploads > 0 ? Math.round((processedUploads / totalUploads) * 100) : 0,
        period: '30 days',
      };
    } catch (error) {
      logger.error('Upload stats error:', error);
      throw new Error('Failed to fetch upload statistics');
    }
  }

  /**
   * Get recent activities
   */
  static async getRecentActivities(companyId, limit = 10) {
    try {
      const missingInvoiceFields = this.missingFields(Invoice, ['invoiceNumber', 'status', 'total', 'updatedAt', 'clientName']);
      if (missingInvoiceFields.length) {
        return {
          status: 'unavailable',
          reason: 'insufficient_data',
          missingFields: { Invoice: missingInvoiceFields },
        };
      }

      const recentInvoices = await Invoice.findAll({
        where: { companyId },
        order: [['updatedAt', 'DESC']],
        limit,
        attributes: ['id', 'invoiceNumber', 'status', 'total', 'updatedAt', 'clientName'],
      });

      const activities = recentInvoices.map(invoice => ({
        id: invoice.id,
        type: 'invoice',
        action: `Invoice ${invoice.invoiceNumber} ${invoice.status}`,
        description: `${invoice.clientName} - €${invoice.total}`,
        timestamp: invoice.updatedAt,
        status: invoice.status,
      }));

      return activities;
    } catch (error) {
      logger.error('Recent activities error:', error);
      throw new Error('Failed to fetch recent activities');
    }
  }

  /**
   * Helper method to get next tax due date
   */
  static getNextTaxDueDate() {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const nextQuarter = currentQuarter === 4 ? 1 : currentQuarter + 1;
    const year = currentQuarter === 4 ? now.getFullYear() + 1 : now.getFullYear();

    // German VAT reports are due on the 10th of the month following the quarter
    const dueDates = {
      1: new Date(year, 3, 10), // Q1 due April 10
      2: new Date(year, 6, 10), // Q2 due July 10
      3: new Date(year, 9, 10), // Q3 due October 10
      4: new Date(year, 0, 10),  // Q4 due January 10
    };

    return dueDates[nextQuarter].toISOString().split('T')[0];
  }
}

module.exports = DashboardService;
