
const express = require('express');
const router = express.Router();
const { exportUserData, anonymizeUser } = require('../services/gdprService');
const { authenticate } = require('../middleware/authMiddleware');

// GET /api/gdpr/export-user-data?userId= (default: self)
router.get('/export-user-data', authenticate, async (req, res) => {
  try {
    const targetUserId = req.query.userId ? Number(req.query.userId) : req.user.id;
    const data = await exportUserData(req.user, targetUserId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/gdpr/anonymize-user { userId, reason }
router.post('/anonymize-user', authenticate, async (req, res) => {
  try {
    const targetUserId = req.body.userId ? Number(req.body.userId) : req.user.id;
    const reason = req.body.reason;
    const user = await anonymizeUser(req.user, targetUserId, reason);
    res.json({ success: true, user });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
