
import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';

export const usersAPI = {
  async list() {
    const res = await api.get('/users');
    const data = res.data?.users ?? res.data;
    if (isDemoMode() && (!data || (Array.isArray(data) && data.length === 0))) {
      return DEMO_DATA.users;
    }
    return data;
  },
  async create(payload) {
    const res = await api.post('/users', payload);
    return res.data;
  },
  async update(userId, payload) {
    const res = await api.put(`/users/${userId}`, payload);
    return res.data;
  },
};

export default usersAPI;
