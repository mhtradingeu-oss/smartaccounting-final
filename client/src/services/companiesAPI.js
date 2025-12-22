
import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';

export const companiesAPI = {
  async list() {
    // GET /companies
    const res = await api.get('/companies');
    const data = res.data;
    if (isDemoMode() && (!data || (Array.isArray(data) && data.length === 0))) {
      return DEMO_DATA.companies;
    }
    return data;
  },
  async update(companyId, payload) {
    const res = await api.put(`/companies/${companyId}`, payload);
    return res.data;
  },
  // Add more company-related API methods as needed
};
