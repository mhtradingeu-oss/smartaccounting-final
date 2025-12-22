
export const formatCurrency = (amount, currency = 'EUR', locale = 'de-DE') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatDate = (date, locale = 'de-DE') => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
};

export const formatDateTime = (date, locale = 'de-DE') => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const formatPercent = (value, decimals = 2) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatFileSize = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) {return '0 Bytes';}
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
};

export const formatPhoneNumber = (phone) => {
  
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('49')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
  }
  
  return phone;
};

export const truncateText = (text, maxLength = 50) => {
  if (text.length <= maxLength) {return text;}
  return `${text.substring(0, maxLength)}...`;
};
