
import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';

const normalizeDemoUsers = (users = []) =>
  users.map((user, index) => {
    const [firstName, ...rest] = (user.name ?? 'Demo User').split(' ');
    const fallbackLastName = rest.join(' ') || 'User';
    return {
      id: user.id ?? `demo-user-${index + 1}`,
      firstName: user.firstName ?? firstName,
      lastName: user.lastName ?? fallbackLastName,
      email: user.email ?? `demo${index + 1}@smartaccounting.com`,
      role: user.role ?? 'viewer',
      isActive: user.isActive ?? true,
    };
  });

export const usersAPI = {
  async list() {
    const res = await api.get('/users');
    const payload = res.data ?? res;
    const data = Array.isArray(payload)
      ? payload
      : payload?.users ?? payload?.data?.users ?? payload;
    if (!Array.isArray(data)) {
      throw new Error('Unexpected users response shape.');
    }
    if (isDemoMode() && data.length === 0) {
      return normalizeDemoUsers(DEMO_DATA.users);
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
