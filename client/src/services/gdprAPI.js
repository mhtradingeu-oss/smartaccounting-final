import api from './api';

export const gdprAPI = {
  async exportUser(userId) {
    const params = userId ? { userId } : undefined;
    const res = await api.get('/gdpr/export-user-data', { params });
    return res.data;
  },
  async anonymizeUser(userId, reason = 'Requested via GDPR UI') {
    const payload = {
      reason,
    };
    if (userId) {
      payload.userId = userId;
    }
    const res = await api.post('/gdpr/anonymize-user', payload);
    return res.data;
  },
};

export default gdprAPI;
