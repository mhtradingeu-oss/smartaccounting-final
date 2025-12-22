// aiSuggest.js
// Phase 12: AI Suggestions route (read-only, human-in-the-loop)

const express = require('express');
const router = express.Router();
const { getSuggestion } = require('../services/ai/aiSuggestionService');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');

// GET /api/ai/suggest — strictly read-only, advisory only
router.get('/suggest', authenticate, requireCompany, async (req, res) => {
  const { userId, companyId } = req;
  const { prompt, context } = req.query;

  try {
    const suggestion = await getSuggestion({ userId, companyId, prompt, context });
    res.json({ suggestion });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
