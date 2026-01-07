import React from 'react';
import { useTranslation } from 'react-i18next';
import { APP_VERSION } from '../lib/constants';

const Footer = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="flex flex-col items-center justify-center py-3 text-xs text-gray-500 dark:text-gray-400 select-none w-full space-y-1">
      <span>Version {APP_VERSION}</span>
      <span>{t('footer.copyright', { year })}</span>
      <div className="flex gap-3 mt-1">
        <a href="/terms" className="underline hover:text-blue-600">
          Terms
        </a>
        <span>|</span>
        <a href="/privacy" className="underline hover:text-blue-600">
          Privacy
        </a>
      </div>
    </footer>
  );
};

export default Footer;
