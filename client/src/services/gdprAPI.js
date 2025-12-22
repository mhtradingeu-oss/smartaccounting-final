import api from './api';

export const gdprAPI = {
  async exportUser(userId) {
    const res = await api.get(`/gdpr/export/${userId}`);
    return res.data;
  },
  async anonymizeUser(userId) {
    const res = await api.post(`/gdpr/anonymize/${userId}`);
    return res.data;
  },
};

export default gdprAPI;
