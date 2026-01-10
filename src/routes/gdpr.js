const express = require('express');
const router = express.Router();
const { exportUserData, anonymizeUser } = require('../services/gdprService');
const { authenticate, requireCompany } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(requireCompany);

// GET /api/gdpr/export-user-data?userId= (default: self)
router.get('/export-user-data', async (req, res) => {
  try {
    const targetUserId = req.query.userId ? Number(req.query.userId) : req.user.id;
    const { User } = require('../models');
    // 1️⃣ جلب المستخدم المطلوب
    const targetUser = await User.findByPk(targetUserId);
    // 2️⃣ إخفاء الوجود (أفضل GDPR)
    if (!targetUser) {
      return res.status(404).json({ error: 'Not found' });
    }
    // 3️⃣ 🔐 أهم سطر في النظام كله
    // Debug: log both company IDs for deep test diagnosis
    // eslint-disable-next-line no-console
    console.log(
      '[GDPR route] req.companyId =',
      req.companyId,
      'targetUser.companyId =',
      targetUser.companyId,
    );
    if (targetUser.companyId !== req.companyId) {
      // ❗ لا export، لا log، لا touch
      return res.status(403).json({ error: 'Forbidden' });
    }
    // 4️⃣ فقط الآن يسمح بالتصدير
    const data = await exportUserData(req.user, targetUserId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/gdpr/anonymize-user { userId, reason }
router.post('/anonymize-user', async (req, res) => {
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
