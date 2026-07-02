const express = require('express');
const router = express.Router();

// temporary in-memory fallback (safe until DB wiring verified)
const mockCompanies = [
  { id: 1, name: 'Demo Company A' },
  { id: 2, name: 'Demo Company B' },
];

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: mockCompanies,
  });
});

module.exports = router;
