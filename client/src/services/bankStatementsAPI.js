import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';

export const inferFormat = (filename = '') => {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'csv' || ext === 'txt') {
    return 'CSV';
  }
  if (ext === 'mt940') {
    return 'MT940';
  }
  if (ext === 'xml' || ext === 'camt053') {
    return 'CAMT053';
  }
  if (ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
    return 'OCR';
  }
  // No format matched; return undefined for JS convention
  return undefined;
};

const unwrapData = (response) => response?.data ?? response;

const getDemoStatementTransactions = (statementId) =>
  DEMO_DATA.bankStatementTransactions?.[statementId] ??
  DEMO_DATA.bankStatementTransactions?.default ??
  [];

const getDemoAuditLogs = (statementId) =>
  DEMO_DATA.bankStatementAuditLogs?.[statementId] ??
  DEMO_DATA.bankStatementAuditLogs?.default ??
  [];

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
      throw new Error('Unsupported bank statement format.');
    }

    const formData = new FormData();
    formData.append('bankStatement', file);
    formData.append('format', format);

    const response = await api.post('/bank-statements/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrapData(response);
  },
  previewDryRun: async (file) => {
    const format = inferFormat(file?.name);
    if (!file || !format) {
      throw new Error('Unsupported bank statement format.');
    }

    const formData = new FormData();
    formData.append('bankStatement', file);
    formData.append('format', format);

    const response = await api.post('/bank-statements/import?dryRun=true', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrapData(response);
  },
  confirmImport: async (confirmationToken) => {
    if (!confirmationToken) {
      throw new Error('Confirmation token is required to confirm the import.');
    }

    const response = await api.post('/bank-statements/import/confirm', {
      confirmationToken,
    });
    return unwrapData(response);
  },
  transactions: async (statementId, config = {}) => {
    const response = await api.get(`/bank-statements/${statementId}/transactions`, config);
    const data = unwrapData(response);
    if (isDemoMode()) {
      const normalized = Array.isArray(data)
        ? data
        : data?.transactions ?? data?.data ?? [];
      if (normalized.length === 0) {
        return getDemoStatementTransactions(statementId);
      }
    }
    return data;
  },
  updateTransaction: async (transactionId, payload = {}, config = {}) => {
    const response = await api.put(
      `/bank-statements/transactions/${transactionId}/categorize`,
      payload,
      config,
    );
    return unwrapData(response);
  },
  reconcileTransaction: async (transactionId, payload = {}, config = {}) => {
    const response = await api.post(
      `/bank-statements/transactions/${transactionId}/reconcile`,
      payload,
      config,
    );
    return unwrapData(response);
  },
  undoReconciliation: async (transactionId, payload = {}, config = {}) => {
    const response = await api.post(
      `/bank-statements/transactions/${transactionId}/reconcile/undo`,
      payload,
      config,
    );
    return unwrapData(response);
  },
  auditLogs: async (statementId, config = {}) => {
    const response = await api.get(`/bank-statements/${statementId}/audit-logs`, config);
    const data = unwrapData(response);
    if (isDemoMode()) {
      const normalized = Array.isArray(data) ? data : data?.logs ?? data?.data ?? [];
      if (normalized.length === 0) {
        return getDemoAuditLogs(statementId);
      }
    }
    return data;
  },
};

export default bankStatementsAPI;
