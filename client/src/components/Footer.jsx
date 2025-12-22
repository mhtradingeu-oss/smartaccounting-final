import React from 'react';


const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="flex flex-col items-center justify-center py-3 text-xs text-gray-500 dark:text-gray-400 select-none w-full">
      <div className="flex items-center gap-2 font-semibold text-base mb-1">
        <img src="/generated-icon.png" alt="SmartAccounting Logo" className="w-5 h-5 rounded" />
        <span>SmartAccounting</span>
      </div>
      <div className="flex items-center gap-2">
        <span>Made in Germany</span>
        <span>•</span>
        <span>© {year}</span>
      </div>
    </footer>
  );
};

export default Footer;
