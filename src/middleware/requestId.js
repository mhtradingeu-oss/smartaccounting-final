// Middleware to assign a unique requestId to every request for correlation in logs and traces.
const { v4: uuidv4 } = require('uuid');
const { runWithContext } = require('../lib/logger/context');

function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  const requestContext = {
    requestId,
    ip: req.ip,
    method: req.method,
    path: req.originalUrl,
  };

  req.requestId = requestId;
  req.context = requestContext;
  res.setHeader('X-Request-Id', requestId);

  runWithContext(requestContext, () => next());
}

module.exports = requestIdMiddleware;
