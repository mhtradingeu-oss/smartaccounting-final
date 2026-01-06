import { describe, it, expect } from 'vitest';
import { ROUTE_DEFINITIONS } from '../App';
import {
  MAIN_NAVIGATION_ITEMS,
  MANAGEMENT_NAVIGATION_ITEMS,
  ADMIN_NAVIGATION_ITEMS,
} from '../navigation/sidebarNavigation';

const navEntries = [
  ...MAIN_NAVIGATION_ITEMS,
  ...MANAGEMENT_NAVIGATION_ITEMS,
  ...ADMIN_NAVIGATION_ITEMS,
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
