import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(__dirname, '../src/locales');
const BASE_LOCALE = 'en';

const flattenKeys = (obj, prefix = '') => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...acc, ...flattenKeys(value, nextKey) };
    }
    return { ...acc, [nextKey]: true };
  }, {});
};

const readLocale = (locale) => {
  const filePath = path.join(LOCALES_DIR, locale, 'translation.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing translation file for locale "${locale}" at ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const main = () => {
  const locales = fs.readdirSync(LOCALES_DIR).filter((entry) => {
    const entryPath = path.join(LOCALES_DIR, entry);
    return fs.statSync(entryPath).isDirectory();
  });

  if (!locales.includes(BASE_LOCALE)) {
    throw new Error(`Base locale "${BASE_LOCALE}" not found in ${LOCALES_DIR}`);
  }

  const baseKeys = Object.keys(flattenKeys(readLocale(BASE_LOCALE)));

  let hasProblems = false;

  locales.forEach((locale) => {
    const localeKeys = Object.keys(flattenKeys(readLocale(locale)));
    const missing = baseKeys.filter((key) => !localeKeys.includes(key));
    const extra = localeKeys.filter((key) => !baseKeys.includes(key));
    if (missing.length || extra.length) {
      hasProblems = true;
      console.log(`\nLocale "${locale}" differs from base "${BASE_LOCALE}":`);
      if (missing.length) {
        console.log(`  Missing keys (${missing.length}):`);
        missing.forEach((key) => console.log(`    - ${key}`));
      }
      if (extra.length) {
        console.log(`  Extra keys (${extra.length}):`);
        extra.forEach((key) => console.log(`    - ${key}`));
      }
    }
  });

  if (!hasProblems) {
    console.log('Locales are in sync with the base locale.');
    process.exit(0);
  }

  console.error('\nLocale sync check failed.');
  process.exit(1);
};

try {
  main();
} catch (error) {
  console.error('i18n verification error:', error.message);
  process.exit(1);
}
