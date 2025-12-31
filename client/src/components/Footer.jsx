import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="flex flex-col items-center justify-center py-3 text-xs text-gray-500 dark:text-gray-400 select-none w-full space-y-1">
      <span>{t('footer.version')}</span>
      <span>{t('footer.copyright', { year })}</span>
    </footer>
  );
};

export default Footer;
