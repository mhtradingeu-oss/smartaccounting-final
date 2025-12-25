import React from 'react';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="flex flex-col items-center justify-center py-3 text-xs text-gray-500 dark:text-gray-400 select-none w-full">
      <div className="font-semibold text-base mb-1 text-center">SmartAccounting</div>
      <div className="text-center mb-1">Modern Accounting. Smarter Decisions.</div>
      <div className="flex flex-col items-center gap-0.5">
        <span>© {year} SmartAccounting</span>
        <span>Developed by Crew Art · Powered by MH Trading UG (Germany)</span>
      </div>
    </footer>
  );
};

export default Footer;
