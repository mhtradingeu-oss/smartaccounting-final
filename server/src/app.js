const express = require('express');
const cors = require('./core/security/cors');
const systemGuard = require('./core/guard/system.guard');

const app = express();
systemGuard.claimExpressApp(app);

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const voiceRoutes = require('./modules/voice/voice.routes');

systemGuard.registerRoute(app, '/auth', authRoutes);
systemGuard.registerRoute(app, '/api/auth', authRoutes);
systemGuard.registerRoute(app, '/api/companies', companyRoutes);
systemGuard.registerRoute(app, '/api/voice', voiceRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'smartaccounting' }));

systemGuard.validateRequiredRoutes(app, ['/auth', '/api/auth', '/api/companies', '/api/voice']);

module.exports = app;
