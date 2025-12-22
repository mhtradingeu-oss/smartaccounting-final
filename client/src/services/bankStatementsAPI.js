
import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';

const inferFormat = (filename = '') => {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'csv' || ext === 'txt') {return 'CSV';}
  if (ext === 'mt940') {return 'MT940';}
  if (ext === 'xml' || ext === 'camt053') {return 'CAMT053';}
  return null;
};

const unwrapData = (response) => response?.data ?? response;

export const bankStatementsAPI = {
  list: async (config = {}) => {
    const response = await api.get('/bank-statements', config);
    const data = unwrapData(response);
    if (isDemoMode() && (!data || (Array.isArray(data) && data.length === 0))) {
      return DEMO_DATA.bankStatements;
    }
    return data;
  },
  upload: async (file) => {
    const format = inferFormat(file?.name);
    if (!file || !format) {
      throw new Error('Unsupported bank statement format for v0.1');
    }

    const formData = new FormData();
    formData.append('bankStatement', file);
    formData.append('format', format);

    const response = await api.post('/bank-statements/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrapData(response);
  },
  transactions: async (statementId, config = {}) => {
    const response = await api.get(`/bank-statements/${statementId}/transactions`, config);
    return unwrapData(response);
  },
  updateTransaction: async (transactionId, payload = {}, config = {}) => {
    const response = await api.put(`/bank-statements/transactions/${transactionId}/categorize`, payload, config);
    return unwrapData(response);
  },
};

export default bankStatementsAPI;
