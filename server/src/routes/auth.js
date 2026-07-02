const express = require('express');
const router = express.Router();

// NOW MATCHES /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  return res.json({
    token: 'dev-token',
    user: { id: 1, email },
  });
});

module.exports = router;
