import api from './api';

export const auditLogsAPI = {
  async list() {
    const res = await api.get('/audit-logs');
    return res.data?.logs ?? res.data;
  },
};

export default auditLogsAPI;
