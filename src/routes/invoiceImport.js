const express = require('express');
const multer = require('multer');
const csv = require('csv-parse/sync');
const { requireRole, requireCompany } = require('../middleware/authMiddleware');
const invoiceService = require('../services/invoiceService');
const { withAuditLog } = require('../services/withAuditLog');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireCompany);
router.use(requireRole(['admin', 'accountant']));

const parseMaybeJson = (value, fallback) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const normalizeImportedInvoice = (raw = {}) => {
  const parsedItems = parseMaybeJson(raw.items, null);
  const items =
    parsedItems ||
    [
      {
        description: raw.description || raw.itemDescription,
        quantity: raw.quantity,
        unitPrice: raw.unitPrice || raw.price,
        vatRate: raw.vatRate,
      },
    ].filter((item) => item.description || item.quantity || item.unitPrice || item.vatRate);

  return {
    invoiceNumber: raw.invoiceNumber || undefined,
    clientName: raw.clientName || raw.customerName || raw.customerId,
    currency: raw.currency || 'EUR',
    date: raw.date || raw.issueDate,
    dueDate: raw.dueDate,
    notes: raw.notes || null,
    status: 'DRAFT',
    items: items.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice ?? item.price),
      vatRate: Number(item.vatRate) > 1 ? Number(item.vatRate) / 100 : Number(item.vatRate),
    })),
  };
};

const readImportFile = (file) => {
  if (!file) {
    const err = new Error('Choose a CSV or JSON file to import.');
    err.status = 400;
    throw err;
  }
  const { buffer, originalname } = file;
  if (originalname.endsWith('.csv')) {
    return csv.parse(buffer.toString(), { columns: true, skip_empty_lines: true });
  }
  if (originalname.endsWith('.json')) {
    const parsed = JSON.parse(buffer.toString());
    return Array.isArray(parsed) ? parsed : parsed.invoices || [];
  }
  const err = new Error('Unsupported file type. Upload a CSV or JSON file.');
  err.status = 400;
  throw err;
};

const validateInvoice = (invoice) => {
  const errors = [];
  if (!invoice.clientName) {
    errors.push('Client name is required.');
  }
  if (!invoice.date) {
    errors.push('Issue date is required.');
  }
  if (!invoice.dueDate) {
    errors.push('Due date is required.');
  }
  if (!Array.isArray(invoice.items) || invoice.items.length === 0) {
    errors.push('At least one line item is required.');
  }
  invoice.items.forEach((item, index) => {
    if (!item.description) {
      errors.push(`Line ${index + 1}: description is required.`);
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      errors.push(`Line ${index + 1}: quantity must be positive.`);
    }
    if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      errors.push(`Line ${index + 1}: unit price must be zero or greater.`);
    }
    if (!Number.isFinite(item.vatRate) || item.vatRate < 0 || item.vatRate > 1) {
      errors.push(`Line ${index + 1}: VAT rate must be between 0 and 1, or 0 and 100%.`);
    }
  });
  return errors;
};

const buildPreviewRows = (invoices) =>
  invoices.map((raw, idx) => {
    const invoice = normalizeImportedInvoice(raw);
    const errors = validateInvoice(invoice);
    return {
      row: idx + 1,
      valid: errors.length === 0,
      errors,
      invoice: {
        invoiceNumber: invoice.invoiceNumber || 'Auto-generated',
        clientName: invoice.clientName || '',
        date: invoice.date || '',
        dueDate: invoice.dueDate || '',
        itemCount: invoice.items.length,
        status: 'draft',
      },
    };
  });

// Preview import (no DB write)
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    const invoices = readImportFile(req.file);
    const results = buildPreviewRows(invoices);
    res.json({ success: true, preview: results });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

// Commit import after validation.
router.post('/commit', upload.single('file'), async (req, res) => {
  try {
    const rawInvoices = readImportFile(req.file);
    const invoices = rawInvoices.map(normalizeImportedInvoice);
    const errors = invoices
      .map((invoice, idx) => ({ row: idx + 1, errors: validateInvoice(invoice) }))
      .filter((row) => row.errors.length > 0);

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const created = [];
    for (const invoiceData of invoices) {
      const invoice = await withAuditLog(
        {
          action: 'invoice_import_create',
          resourceType: 'Invoice',
          resourceId: null,
          userId: req.userId,
          oldValues: null,
          newValues: invoiceData,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          reason: 'Imported via invoice import workflow',
        },
        async () => invoiceService.createInvoice(invoiceData, req.userId, req.companyId),
      );
      created.push(invoice);
    }

    res.json({ success: true, importedCount: created.length, invoices: created });
  } catch (err) {
    if (err.errors) {
      res.status(400).json({ success: false, errors: err.errors });
    } else {
      res.status(500).json({ success: false, message: err.message });
    }
  }
});

module.exports = router;
