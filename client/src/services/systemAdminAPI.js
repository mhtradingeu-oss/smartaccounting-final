import api from './api';

export const systemAdminAPI = {
  async getOverview() {
    const res = await api.get('/system/overview');
    return res.data;
  },
  async listCompanies() {
    const res = await api.get('/system/companies');
    return res.data?.companies ?? [];
  },
  async createCompany(payload) {
    const res = await api.post('/system/companies', payload);
    return res.data?.company ?? res.data;
  },
  async suspendCompany(companyId, payload = {}) {
    const res = await api.patch(`/system/companies/${companyId}/suspend`, payload);
    return res.data?.company ?? res.data;
  },
  async restoreCompany(companyId) {
    const res = await api.patch(`/system/companies/${companyId}/restore`);
    return res.data?.company ?? res.data;
  },
  async updateCompanyFlags(companyId, payload) {
    const res = await api.patch(`/system/companies/${companyId}/flags`, payload);
    return res.data?.company ?? res.data;
  },
  async deleteCompany(companyId) {
    const res = await api.delete(`/system/companies/${companyId}`);
    return res.data;
  },
  async listUsers() {
    const res = await api.get('/system/users');
    return res.data?.users ?? [];
  },
  async createUser(payload) {
    const res = await api.post('/system/users', payload);
    return res.data?.user ?? res.data;
  },
  async updateUser(userId, payload) {
    const res = await api.patch(`/system/users/${userId}`, payload);
    return res.data?.user ?? res.data;
  },
  async getPlans() {
    const res = await api.get('/system/plans');
    return res.data?.plans ?? [];
  },
  async getSubscriptions() {
    const res = await api.get('/system/subscriptions');
    return res.data?.subscriptions ?? [];
  },
  async getFeatureFlags() {
    const res = await api.get('/system/feature-flags');
    return res.data;
  },
  async getAuditLogs(limit = 50) {
    const res = await api.get('/system/audit-logs', { params: { limit } });
    return res.data?.logs ?? [];
  },
  async getBackups() {
    const res = await api.get('/system/backups');
    return res.data;
  },
  async getMaintenance() {
    const res = await api.get('/system/maintenance');
    return res.data?.maintenance ?? res.data;
  },
  async setMaintenance(payload) {
    const res = await api.post('/system/maintenance', payload);
    return res.data?.maintenance ?? res.data;
  },
  async getConfig() {
    const res = await api.get('/system/config');
    return res.data?.config ?? res.data;
  },
  async getMonitoring() {
    const res = await api.get('/system/monitoring');
    return res.data?.monitoring ?? res.data;
  },
};

export default systemAdminAPI;
