import { describe, it, expect } from 'vitest';
import { ROUTE_DEFINITIONS } from '../App';
import {
  CORE_NAVIGATION_ITEMS,
  ACCOUNTING_NAVIGATION_ITEMS,
  INTELLIGENCE_NAVIGATION_ITEMS,
  COMPLIANCE_NAVIGATION_ITEMS,
  ADMINISTRATION_NAVIGATION_ITEMS,
} from '../navigation/sidebarNavigation';

const navEntries = [
  ...CORE_NAVIGATION_ITEMS,
  ...ACCOUNTING_NAVIGATION_ITEMS,
  ...INTELLIGENCE_NAVIGATION_ITEMS,
  ...COMPLIANCE_NAVIGATION_ITEMS,
  ...ADMINISTRATION_NAVIGATION_ITEMS,
];

const matchesRoute = (href, routePath) => {
  if (routePath.endsWith('/*')) {
    const base = routePath.replace(/\/\*$/, '');
    return href === base || href.startsWith(`${base}/`);
  }
  return href === routePath;
};

describe('route configuration', () => {
  it('exposes unique route paths', () => {
    const paths = ROUTE_DEFINITIONS.map((route) => route.path);
    const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
    expect(duplicates).toEqual([]);
  });

  it('has nav entries that point to known routes', () => {
    navEntries.forEach((entry) => {
      const hasRoute = ROUTE_DEFINITIONS.some((route) =>
        matchesRoute(entry.href, route.path),
      );
      expect(hasRoute).toBe(true);
    });
  });

  it('keeps sidebar hrefs unique', () => {
    const hrefs = navEntries.map((entry) => entry.href);
    const duplicates = hrefs.filter((href, index) => hrefs.indexOf(href) !== index);
    expect(duplicates).toEqual([]);
  });
});
