import api from './api';

export const auditLogsAPI = {
  async list(params = {}) {
    const res = await api.get('/exports/audit-logs', {
      params: {
        format: 'json',
        ...params,
      },
    });
    const payload = res.data?.logs ?? res.data;
    if (!Array.isArray(payload)) {
      throw new Error('Unexpected audit logs response shape.');
    }
    return payload;
  },
};

export default auditLogsAPI;
