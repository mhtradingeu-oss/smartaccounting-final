const express = require('express');
const { authenticate, requireAdmin, requireCompany } = require('../middleware/authMiddleware');
const { Invoice, Expense, BankStatement, BankTransaction, Company } = require('../models');
const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);
router.use(requireCompany);

// POST /api/admin/demo-data/load
router.post('/demo-data/load', async (req, res) => {
  try {
    // Only allow for Default Company and admin
    const company = await Company.findByPk(req.user.companyId);
    if (!company || company.name !== 'Default Company') {
      return res
        .status(403)
        .json({ success: false, message: 'Demo data only allowed for Default Company.' });
    }
    // Idempotency: check if demo data exists
    const demoInvoice = await Invoice.findOne({
      where: { companyId: company.id, invoiceNumber: 'DEMO-INV-001' },
    });
    if (demoInvoice) {
      return res.json({ success: true, message: 'Demo data already loaded.' });
    }
    // Create demo invoices
    await Invoice.bulkCreate([
      {
        invoiceNumber: 'DEMO-INV-001',
        subtotal: 1000,
        total: 1190,
        amount: 1190,
        currency: 'EUR',
        status: 'PAID',
        date: new Date(),
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        invoiceNumber: 'DEMO-INV-002',
        subtotal: 500,
        total: 595,
        amount: 595,
        currency: 'EUR',
        status: 'DRAFT',
        date: new Date(),
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    // Create demo expenses
    await Expense.bulkCreate([
      {
        description: 'Demo Expense 1',
        amount: 200,
        currency: 'EUR',
        vendor: 'Demo Vendor',
        date: new Date(),
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        description: 'Demo Expense 2',
        amount: 150,
        currency: 'EUR',
        vendor: 'Demo Vendor',
        date: new Date(),
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    // Create demo bank statement
    const statement = await BankStatement.create({
      statementDate: new Date(),
      openingBalance: 5000,
      closingBalance: 6000,
      companyId: company.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await BankTransaction.bulkCreate([
      {
        bankStatementId: statement.id,
        date: new Date(),
        description: 'Demo Transaction 1',
        amount: 1000,
        currency: 'EUR',
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        bankStatementId: statement.id,
        date: new Date(),
        description: 'Demo Transaction 2',
        amount: -200,
        currency: 'EUR',
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    return res.json({ success: true, message: 'Demo data loaded.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
