#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * Express Route Auditor
 * - Lists all registered routes
 * - Classifies them (public / auth / admin)
 * - Outputs console table + JSON artifact
 */

process.env.USE_SQLITE = process.env.USE_SQLITE || 'true';
process.env.NODE_ENV = process.env.NODE_ENV || 'audit';

const fs = require('fs');
const path = require('path');
const app = require('../src/app');

/* --------------------------------------------------
 * Helpers
 * -------------------------------------------------- */

const normalizeLayerPath = (layer) => {
  if (!layer?.regexp) {
    return '';
  }

  let path = layer.regexp.source;

  [
    ['\\/?', ''],
    ['(?=\\/|$)', ''],
    ['^', ''],
    ['$', ''],
  ].forEach(([from, to]) => {
    path = path.replace(from, to);
  });

  path = path.replace(/\\\//g, '/');

  layer.keys?.forEach((key) => {
    path = path.replace('([^\\/]+?)', `:${key.name}`);
  });

  return path.replace(/\/+/g, '/');
};

const joinPaths = (a, b) => {
  if (!a) {
    return b || '';
  }
  if (!b) {
    return a;
  }
  return `${a.replace(/\/$/, '')}/${b.replace(/^\//, '')}`;
};

const classifyRoute = (routePath) => {
  if (/^\/auth|\/health|\/status/.test(routePath)) {
    return 'public';
  }
  if (/^\/admin|\/users/.test(routePath)) {
    return 'admin';
  }
  return 'authenticated';
};

/* --------------------------------------------------
 * Traversal
 * -------------------------------------------------- */

const routes = [];

const traverse = (stack, prefix = '') => {
  stack.forEach((layer) => {
    if (layer.route?.path) {
      const methods = Object.keys(layer.route.methods || {}).map((m) => m.toUpperCase());
      const fullPath = joinPaths(prefix, layer.route.path);

      routes.push({
        path: fullPath || '/',
        methods: methods.length ? methods.sort() : ['ALL'],
        access: classifyRoute(fullPath),
      });
    } else if (layer?.handle?.stack) {
      const subPath = normalizeLayerPath(layer);
      traverse(layer.handle.stack, joinPaths(prefix, subPath));
    }
  });
};

if (!app?._router?.stack) {
  console.error('❌ Express router stack not found');
  process.exit(1);
}

traverse(app._router.stack);

/* --------------------------------------------------
 * Output
 * -------------------------------------------------- */

const sorted = routes.sort((a, b) =>
  a.path === b.path
    ? a.methods.join(',').localeCompare(b.methods.join(','))
    : a.path.localeCompare(b.path),
);

const maxMethod = Math.max(...sorted.map((r) => r.methods.join(', ').length), 10);

console.log('\nMETHODS'.padEnd(maxMethod), 'ACCESS'.padEnd(14), 'PATH');
console.log('-'.repeat(maxMethod), '-'.repeat(14), '----');

sorted.forEach((r) => {
  console.log(r.methods.join(', ').padEnd(maxMethod), r.access.padEnd(14), r.path);
});

console.log(`\nTotal routes: ${sorted.length}`);

/* --------------------------------------------------
 * JSON artifact (CI / audit)
 * -------------------------------------------------- */

const outPath = path.join(process.cwd(), 'route-audit.json');

fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      total: sorted.length,
      routes: sorted,
    },
    null,
    2,
  ),
);

console.log(`📄 Route audit written to ${outPath}`);
