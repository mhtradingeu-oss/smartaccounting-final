#!/usr/bin/env node
/* eslint-disable no-console */
// Lists all routes registered on the Express app for auditing purposes.

process.env.USE_SQLITE = process.env.USE_SQLITE || 'true';

const app = require('../src/app');

const normalizeLayerPath = (layer) => {
  if (!layer?.regexp) {return '';}

  let path = layer.regexp.source;
  const prefixReplacements = [
    ['\\/?', ''],
    ['(?=\\/|$)', ''],
    ['^', ''],
    ['$', ''],
  ];

  prefixReplacements.forEach(([target, replacement]) => {
    path = path.replace(target, replacement);
  });

  path = path.replace(/\\\//g, '/');
  layer.keys?.forEach((key) => {
    path = path.replace('([^\\/]+?)', `:${key.name}`);
  });
  path = path.replace(/\/+/g, '/');

  if (path === '/') {
    return '';
  }

  return path;
};

const joinPaths = (base, addition) => {
  if (!base) {return addition || '';}
  if (!addition) {return base;}
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedAddition = addition.startsWith('/') ? addition.slice(1) : addition;
  return `${trimmedBase}/${trimmedAddition}`;
};

const routes = [];

const traverseStack = (stack, prefix = '') => {
  stack.forEach((layer) => {
    if (layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods || {}).map((method) => method.toUpperCase());
      const routePath = joinPaths(prefix, layer.route.path);
      routes.push({
        path: routePath || '/',
        methods: methods.length ? methods.sort() : ['ALL'],
      });
    } else if (layer?.handle?.stack) {
      const layerPrefix = normalizeLayerPath(layer);
      const nextPrefix = joinPaths(prefix, layerPrefix);
      traverseStack(layer.handle.stack, nextPrefix);
    }
  });
};

if (!app || !app._router) {
  console.error('Express app or router stack not found.');
  process.exit(1);
}

traverseStack(app._router.stack);

const sortedRoutes = routes.sort((a, b) => {
  if (a.path === b.path) {
    return a.methods.join('') > b.methods.join('') ? 1 : -1;
  }
  return a.path > b.path ? 1 : -1;
});

const longestMethod = Math.max(...sortedRoutes.map((route) => route.methods.join(', ').length), 10);

console.log(`\n${'METHODS'.padEnd(longestMethod)}  PATH`);
console.log(`${'-'.repeat(longestMethod)}  ----`);
sortedRoutes.forEach((route) => {
  console.log(`${route.methods.join(', ').padEnd(longestMethod)}  ${route.path}`);
});

console.log(`\nTotal routes: ${sortedRoutes.length}`);
