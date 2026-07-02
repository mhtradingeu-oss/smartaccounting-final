const APP_GUARD_KEY = Symbol.for('smartaccounting.systemGuard.app');
const STARTUP_GUARD_KEY = Symbol.for('smartaccounting.systemGuard.startup');
const ROUTES_GUARD_KEY = Symbol.for('smartaccounting.systemGuard.routes');

function isDevFriendlyMode() {
  const friendlyFlag = String(process.env.DEV_FRIENDLY_MODE || '').toLowerCase() === 'true';
  const nodeDev = process.env.NODE_ENV === 'development';
  return friendlyFlag || nodeDev;
}

function logDev(level, category, message) {
  if (!isDevFriendlyMode()) {
    return;
  }

  const writer = typeof console[level] === 'function' ? console[level] : console.log;
  writer(`[DEV-GUARD] ${category}: ${message}`);
}

function logDevInfo(message) {
  logDev('log', 'info', message);
}

function logDevWarning(message) {
  logDev('warn', 'warning', message);
}

function logDevRouteCheck(message) {
  logDev('warn', 'route-check', message);
}

if (!global[ROUTES_GUARD_KEY]) {
  global[ROUTES_GUARD_KEY] = new Set();
}

function claimExpressApp(app) {
  if (!app || typeof app.use !== 'function') {
    throw new Error('System Integrity Guard: invalid Express app instance');
  }

  if (global[APP_GUARD_KEY] && global[APP_GUARD_KEY] !== app) {
    throw new Error('System Integrity Guard: multiple Express app instances detected');
  }

  global[APP_GUARD_KEY] = app;
}

function claimServerStartup() {
  if (global[STARTUP_GUARD_KEY]) {
    throw new Error('System Integrity Guard: duplicate server startup attempt detected');
  }

  global[STARTUP_GUARD_KEY] = true;
}

function assertNotAlreadyRunning(serverInstance) {
  if (serverInstance && serverInstance.listening) {
    if (isDevFriendlyMode()) {
      logDevWarning('Dev Mode: previous instance ignored safely');
      return false;
    }

    throw new Error('System Integrity Guard: backend server is already running');
  }

  return true;
}

function releaseServerStartup() {
  global[STARTUP_GUARD_KEY] = false;
}

function registerRoute(app, routePath, router) {
  const routes = global[ROUTES_GUARD_KEY];
  if (routes.has(routePath)) {
    console.warn(`System Integrity Guard: duplicate route registration skipped: ${routePath}`);
    return;
  }

  routes.add(routePath);
  app.use(routePath, router);
}

function hasMountedRoute(app, requiredPath) {
  return app._router?.stack?.some((layer) => {
    if (layer.route?.path === requiredPath) {
      return true;
    }

    if (!layer.regexp) {
      return false;
    }

    const pattern = String(layer.regexp);
    const normalized = requiredPath.replace(/\//g, '\\/');
    return pattern.includes(normalized);
  });
}

function validateRequiredRoutes(app, requiredRoutes) {
  const missing = requiredRoutes.filter((routePath) => !hasMountedRoute(app, routePath));
  if (missing.length > 0) {
    if (isDevFriendlyMode()) {
      logDevRouteCheck(`missing required route registration: ${missing.join(', ')}`);
      return false;
    }

    throw new Error(
      `System Integrity Guard: missing required route registration: ${missing.join(', ')}`,
    );
  }

  if (isDevFriendlyMode()) {
    logDevRouteCheck(`required routes verified: ${requiredRoutes.join(', ')}`);
  }

  return true;
}

function printStartupHealth({ port, requiredRoutes }) {
  const routes = global[ROUTES_GUARD_KEY];
  const mountedRoutes = Array.from(routes).sort();

  console.log('[SYSTEM HEALTH] startup=OK');
  console.log(`[SYSTEM HEALTH] pid=${process.pid} port=${port}`);
  console.log(`[SYSTEM HEALTH] requiredRoutes=${requiredRoutes.join(', ')}`);
  console.log(`[SYSTEM HEALTH] mountedRoutes=${mountedRoutes.join(', ')}`);
}

module.exports = {
  isDevFriendlyMode,
  logDevInfo,
  logDevWarning,
  logDevRouteCheck,
  claimExpressApp,
  claimServerStartup,
  assertNotAlreadyRunning,
  releaseServerStartup,
  registerRoute,
  validateRequiredRoutes,
  printStartupHealth,
};
