const express = require('express');
const { requireRole, requireCompany } = require('../middleware/authMiddleware');
const accountingPostingService = require('../services/accountingPostingService');

const router = express.Router();

router.use(requireCompany);

router.post('/:journalEntryId/reverse', requireRole(['admin', 'accountant']), async (req, res, next) => {
  try {
    const result = await accountingPostingService.reverseJournalEntry({
      journalEntryId: req.params.journalEntryId,
      companyId: req.companyId,
      reversedBy: req.user?.id || req.userId || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Journal entry reversed',
      originalEntry: result.originalEntry,
      reversalEntry: result.reversalEntry,
      lines: result.reversalEntry?.lines || result.reversalLines || [],
      reversed: true,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
