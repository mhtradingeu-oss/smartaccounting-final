import api from './api';

export const auditLogsAPI = {
  async list(params = {}) {
    const res = await api.get('/exports/audit-logs', {
      params: {
        format: 'json',
        ...params,
      },
    });
    return res.data?.logs ?? res.data ?? [];
  },
};

export default auditLogsAPI;
