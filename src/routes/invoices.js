const express = require('express');
const { authenticate, requireRole, requireCompany } = require('../middleware/authMiddleware');
const invoiceService = require('../services/invoiceService');
const { withAuditLog } = require('../services/withAuditLog');
const {
  normalizeInvoicePayload,
  logDemoAutoFills,
} = require('../utils/demoPayloadNormalizer');
const demoSimulationService = require('../services/demoSimulationService');

const router = express.Router();

router.use(authenticate);
router.use(requireCompany);

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

// Get payment history for invoice (demo simulation if empty)
router.get(
  '/:invoiceId/payments',
  requireRole(['admin', 'accountant', 'auditor', 'viewer']),
  async (req, res, next) => {
    try {
      const invoiceId = req.params.invoiceId;
      const invoice = await invoiceService.getInvoiceById(invoiceId, req.companyId);

      if (!invoice) {
        return res.status(404).json({ success: false, message: 'Invoice not found' });
      }

      // Try to get real payments from invoiceService if available
      let payments = [];
      try {
        if (invoiceService.getInvoicePayments) {
          payments = await invoiceService.getInvoicePayments(invoiceId, req.companyId);
        }
      } catch (err) {
        // Payments endpoint may not exist - continue without error
      }

      // If no payments and demo mode enabled, generate demo payments
      if (payments.length === 0 && demoSimulationService.DEMO_MODE_ENABLED) {
        demoSimulationService.logDemoSimulation('invoice_payment_history', { invoiceId });
        payments = demoSimulationService.generateDemoInvoicePayments(invoiceId, invoice.total || 1190);

        return res.status(200).json({
          success: true,
          payments,
          demo: true,
          _simulated: true,
          message: 'Simulated payment history for demo environment',
        });
      }

      res.status(200).json({
        success: true,
        payments,
        demo: false,
      });
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
      let result;
      try {
        result = await withAuditLog(
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
      } catch (err) {
        if (err && (err.status === 400 || err.status === 409)) {
          return res.status(err.status).json({ success: false, message: err.message });
        }
        throw err;
      }
      res.status(201).json({ success: true, payment: result.payment, invoice: result.invoice });
    } catch (error) {
      next(error);
    }
  },
);

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
  // Demo mode: normalize payload with auto-fills
  const { normalizedData, demoFills } = normalizeInvoicePayload(
    req.body,
    req.userId,
    req.companyId,
  );

  // Log demo auto-fills to audit trail
  logDemoAutoFills(demoFills, {
    userId: req.userId,
    companyId: req.companyId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    originalPayload: req.body,
  });

  try {
    const invoice = await withAuditLog(
      {
        action: 'invoice_create',
        resourceType: 'Invoice',
        resourceId: null,
        userId: req.userId,
        oldValues: null,
        newValues: normalizedData,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        demoFills: demoFills.length > 0 ? demoFills : undefined,
      },
      async () => invoiceService.createInvoice(normalizedData, req.userId, req.companyId),
    );
    res.status(201).json({
      success: true,
      invoice,
      demoFills: demoFills.length > 0 ? demoFills : undefined,
    });
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
    let invoice;
    try {
      invoice = await withAuditLog(
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
    } catch (err) {
      if (err && (err.status === 400 || err.status === 409)) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      throw err;
    }
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
