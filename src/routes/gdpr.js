const express = require('express');
const router = express.Router();
const { exportUserData, anonymizeUser } = require('../services/gdprService');
const { authenticate } = require('../middleware/authMiddleware');

// GET /api/gdpr/export-user-data?userId= (default: self)
router.get('/export-user-data', authenticate, async (req, res) => {
  try {
    const targetUserId = req.query.userId ? Number(req.query.userId) : req.user.id;
    const { User } = require('../models');
    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Strict company boundary: no admin bypass, no silent success, no export then check
    if (targetUser.companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const data = await exportUserData(req.user, targetUserId);
    res.json({ success: true, data });
  } catch (err) {
    if (err.status === 403 || err.status === 404) {
      return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Internal server error' });
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
