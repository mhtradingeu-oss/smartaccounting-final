

import api from './api';
import { isDemoMode, DEMO_DATA } from '../lib/demoMode';


export const dashboardAPI = {
  getStats: async () => {
    try {
      const response = await api.get('/dashboard/stats');
      const payload = response.data || {};
      const stats = { ...payload };
      delete stats.success;

      if (Object.keys(stats).length === 0) {
        if (isDemoMode()) {
          return { data: DEMO_DATA.dashboard };
        }
        return { data: null };
      }
      return { data: stats };
    } catch (err) {
      if (err.response && err.response.status === 501) {
        // Feature disabled
        return { disabled: true };
      }
      // All other errors
      throw err;
    }
  },
};

export default dashboardAPI;
