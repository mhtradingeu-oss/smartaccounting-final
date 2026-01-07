// Get audit log for invoice
router.get(
  '/:invoiceId/audit-log',
  requireRole(['admin', 'accountant', 'auditor', 'viewer']),
  async (req, res, next) => {
    try {
      const logs = await invoiceService.getInvoiceAuditLog(req.params.invoiceId, req.companyId);
      res.status(200).json({ success: true, auditLog: logs });
    } catch (error) {
      next(error);
    }
  },
);
// Create credit note for invoice (legal correction)
router.post(
  '/:invoiceId/credit-note',
  requireRole(['admin', 'accountant']),
  async (req, res, next) => {
    try {
      const creditNoteData = req.body;
      const oldInvoice = await invoiceService.getInvoiceById(req.params.invoiceId, req.companyId);
      const result = await withAuditLog(
        {
          action: 'invoice_credit_note_create',
          resourceType: 'Invoice',
          resourceId: req.params.invoiceId,
          userId: req.userId,
          oldValues: oldInvoice,
          newValues: creditNoteData,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          reason: creditNoteData.reason || 'Credit note issued',
        },
        async () =>
          invoiceService.createCreditNoteForInvoice(
            req.params.invoiceId,
            creditNoteData,
            req.userId,
            req.companyId,
          ),
      );
      res.status(201).json({
        success: true,
        creditNote: result.creditNote,
        originalInvoice: result.originalInvoice,
      });
    } catch (error) {
      next(error);
    }
  },
);
// Register payment for invoice (partial/full)
router.post(
  '/:invoiceId/payments',
  requireRole(['admin', 'accountant']),
  async (req, res, next) => {
    try {
      const paymentData = req.body;
      const oldInvoice = await invoiceService.getInvoiceById(req.params.invoiceId, req.companyId);
      const result = await withAuditLog(
        {
          action: 'invoice_payment_register',
          resourceType: 'Invoice',
          resourceId: req.params.invoiceId,
          userId: req.userId,
          oldValues: oldInvoice,
          newValues: paymentData,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          reason: paymentData.reason || 'Register payment',
        },
        async () =>
          invoiceService.registerInvoicePayment(
            req.params.invoiceId,
            paymentData,
            req.userId,
            req.companyId,
          ),
      );
      res.status(201).json({ success: true, payment: result.payment, invoice: result.invoice });
    } catch (error) {
      next(error);
    }
  },
);
const express = require('express');
const { authenticate, requireRole, requireCompany } = require('../middleware/authMiddleware');
const invoiceService = require('../services/invoiceService');
const { withAuditLog } = require('../services/withAuditLog');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

// List all invoices
router.get(
  '/',
  requireRole(['admin', 'accountant', 'auditor', 'viewer']),
  async (req, res, next) => {
    try {
      const invoices = await invoiceService.listInvoices(req.companyId);
      res.status(200).json({ success: true, invoices });
    } catch (error) {
      next(error);
    }
  },
);

// Get single invoice by ID
router.get(
  '/:invoiceId',
  requireRole(['admin', 'accountant', 'auditor', 'viewer']),
  async (req, res, next) => {
    try {
      const invoice = await invoiceService.getInvoiceById(req.params.invoiceId, req.companyId);
      if (!invoice) {
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }
      res.status(200).json({ success: true, invoice });
    } catch (error) {
      next(error);
    }
  },
);

// Create invoice (with items, attachments)
router.post('/', requireRole(['admin', 'accountant']), async (req, res, next) => {
  try {
    const invoice = await withAuditLog(
      {
        action: 'invoice_create',
        resourceType: 'Invoice',
        resourceId: null,
        userId: req.userId,
        oldValues: null,
        newValues: req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      async () => invoiceService.createInvoice(req.body, req.userId, req.companyId),
    );
    res.status(201).json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
});

// Update invoice (general update)
router.put('/:invoiceId', requireRole(['admin', 'accountant']), async (req, res, next) => {
  try {
    const oldInvoice = await invoiceService.getInvoiceById(req.params.invoiceId, req.companyId);
    const invoice = await withAuditLog(
      {
        action: 'invoice_update',
        resourceType: 'Invoice',
        resourceId: req.params.invoiceId,
        userId: req.userId,
        oldValues: oldInvoice,
        newValues: req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      async () => invoiceService.updateInvoice(req.params.invoiceId, req.body, req.companyId),
    );
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.status(200).json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
});

// Patch invoice status (status transition)
router.patch('/:invoiceId/status', requireRole(['admin', 'accountant']), async (req, res, next) => {
  try {
    const { status } = req.body;
    const oldInvoice = await invoiceService.getInvoiceById(req.params.invoiceId, req.companyId);
    const invoice = await withAuditLog(
      {
        action: 'invoice_status_change',
        resourceType: 'Invoice',
        resourceId: req.params.invoiceId,
        userId: req.userId,
        oldValues: oldInvoice,
        newValues: { status },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
      async () => invoiceService.updateInvoiceStatus(req.params.invoiceId, status, req.companyId),
    );
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: 'Invoice not found or invalid status transition' });
    }
    res.status(200).json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
