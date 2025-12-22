// Simple per-user/company rate limiter for AI endpoints
const { logRateLimited } = require('../services/ai/aiAuditLogger');
const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30;

module.exports = async function aiRateLimit(req, res, next) {
  const key = `ai:${req.user.companyId}:${req.user.id}`;
  const now = Date.now();
  let entry = rateLimitMap.get(key);
  if (!entry || now - entry.start > WINDOW_MS) {
    entry = { count: 1, start: now };
  } else {
    entry.count += 1;
  }
  rateLimitMap.set(key, entry);
  if (entry.count > MAX_REQUESTS) {
    await logRateLimited({
      userId: req.user.id,
      companyId: req.user.companyId,
      route: req.originalUrl,
      queryType: req.query.queryType,
      prompt: req.query.prompt,
    });
    return res.status(429).json({
      code: 'AI_RATE_LIMIT_EXCEEDED',
      message: 'AI insight rate limit exceeded. Try again later.',
    });
  }
  next();
};
