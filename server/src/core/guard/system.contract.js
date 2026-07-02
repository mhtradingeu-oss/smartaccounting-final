const path = require('path');
const systemGuard = require('./system.guard');

const SYSTEM_CONTRACT = {
  requiredRoutes: ['/auth', '/api/companies', '/api/voice'],
  requiredModules: [
    'express',
    'cors',
    './src/routes/auth',
    './src/routes/companies',
    './src/modules/voice/voice.routes',
  ],
  requiredEnv: ['NODE_ENV', 'PORT'],
};

const SERVER_ROOT = path.resolve(__dirname, '../../..');

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

function resolveContractModule(modulePath) {
  if (modulePath.startsWith('./')) {
    return path.resolve(SERVER_ROOT, modulePath.slice(2));
  }

  return modulePath;
}

function validateSystemContract(app, options = {}) {
  const devMode = systemGuard.isDevFriendlyMode();
  const { serverInstance } = options;

  const routeDetails = {
    missing: [],
    ok: [],
  };

  for (const routePath of SYSTEM_CONTRACT.requiredRoutes) {
    if (hasMountedRoute(app, routePath)) {
      routeDetails.ok.push(routePath);
      continue;
    }

    routeDetails.missing.push(routePath);
  }

  const moduleDetails = {
    missing: [],
    ok: [],
  };

  for (const modulePath of SYSTEM_CONTRACT.requiredModules) {
    try {
      require(resolveContractModule(modulePath));
      moduleDetails.ok.push(modulePath);
    } catch (_error) {
      moduleDetails.missing.push(modulePath);
    }
  }

  const envDetails = {
    missing: [],
    ok: [],
  };

  for (const envName of SYSTEM_CONTRACT.requiredEnv) {
    const value = process.env[envName];
    if (typeof value === 'string' && value.trim() !== '') {
      envDetails.ok.push(envName);
      continue;
    }

    envDetails.missing.push(envName);
  }

  const duplicateListenDetected = Boolean(serverInstance && serverInstance.listening);

  const failures = [];
  if (routeDetails.missing.length > 0) {
    failures.push(`routes missing: ${routeDetails.missing.join(', ')}`);
  }
  if (moduleDetails.missing.length > 0) {
    failures.push(`modules missing: ${moduleDetails.missing.join(', ')}`);
  }
  if (envDetails.missing.length > 0) {
    failures.push(`env missing: ${envDetails.missing.join(', ')}`);
  }
  if (duplicateListenDetected) {
    failures.push('duplicate app.listen detected');
  }

  const contractPass = failures.length === 0;

  if (!contractPass) {
    const message = `System Contract validation failed: ${failures.join(' | ')}`;
    if (devMode) {
      systemGuard.logDevWarning(message);
    } else {
      throw new Error(message);
    }
  }

  return {
    contractPass,
    failures,
    routeDetails,
    moduleDetails,
    envDetails,
    duplicateListenDetected,
  };
}

module.exports = {
  SYSTEM_CONTRACT,
  validateSystemContract,
};
