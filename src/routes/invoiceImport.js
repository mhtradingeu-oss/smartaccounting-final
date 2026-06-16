const express = require('express');
const multer = require('multer');
const csv = require('csv-parse/sync');
const { Invoice, InvoiceItem, sequelize } = require('../models');
const AuditLogService = require('../services/auditLogService');
const { invoiceSchemas } = require('../lib/validation/schemas');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Preview import (no DB write)
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    const { buffer, originalname } = req.file;
    let invoices = [];
    if (originalname.endsWith('.csv')) {
      const records = csv(buffer.toString(), { columns: true, skip_empty_lines: true });
      invoices = records;
    } else if (originalname.endsWith('.json')) {
      invoices = JSON.parse(buffer.toString());
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file type' });
    }
    // Validate each invoice (no calculated fields allowed)
    const results = invoices.map((inv, idx) => {
      const { error } = invoiceSchemas.create.validate(inv, { abortEarly: false });
      return {
        row: idx + 1,
        valid: !error,
        errors: error ? error.details.map((d) => d.message) : [],
      };
    });
    res.json({ success: true, preview: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Commit import (transactional, audit, atomic)
router.post('/commit', upload.single('file'), async (req, res) => {
  const { userId, companyId, requestId } = req;
  try {
    const { buffer, originalname } = req.file;
    let invoices = [];
    if (originalname.endsWith('.csv')) {
      const records = csv(buffer.toString(), { columns: true, skip_empty_lines: true });
      invoices = records;
    } else if (originalname.endsWith('.json')) {
      invoices = JSON.parse(buffer.toString());
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file type' });
    }
    const errors = [];
    await sequelize.transaction(async (t) => {
      for (let idx = 0; idx < invoices.length; idx++) {
        const inv = invoices[idx];
        const { error } = invoiceSchemas.create.validate(inv, { abortEarly: false });
        if (error) {
          errors.push({ row: idx + 1, errors: error.details.map((d) => d.message) });
          continue;
        }
        // Remove calculated fields if present
        delete inv.amount;
        delete inv.vatAmount;
        // Auto-generate invoiceNumber if missing
        if (!inv.invoiceNumber) {
          const year = new Date().getFullYear();
          const max = await Invoice.max('id', { where: { companyId }, transaction: t });
          inv.invoiceNumber = `SA-${companyId}-${year}-${(max || 0) + 1}`;
        }
        // Create invoice and items
        const invoice = await Invoice.create(
          { ...inv, companyId, status: 'DRAFT', source: 'import' },
          { transaction: t },
        );
        if (Array.isArray(inv.items)) {
          for (const item of inv.items) {
            await InvoiceItem.create({ ...item, invoiceId: invoice.id }, { transaction: t });
          }
        }
        await AuditLogService.create(
          {
            action: 'import_invoice',
            resourceType: 'Invoice',
            resourceId: invoice.id,
            companyId,
            userId,
            requestId,
            newValues: invoice.toJSON(),
            reason: 'Imported via API',
            timestamp: new Date(),
          },
          { transaction: t },
        );
      }
      if (errors.length > 0) {
        throw { errors };
      }
    });
    res.json({ success: true });
  } catch (err) {
    if (err.errors) {
      res.status(400).json({ success: false, errors: err.errors });
    } else {
      res.status(500).json({ success: false, message: err.message });
    }
  }
});

module.exports = router;
