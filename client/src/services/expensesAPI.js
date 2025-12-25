import api from './api';

export const expensesAPI = {
  list: async ({ companyId }) => {
    const response = await api.get(`/expenses?companyId=${companyId}`);
    return response.data?.expenses ?? [];
  },
  create: async (data) => {
    const response = await api.post('/expenses', data);
    return response.data;
  },
  get: async (id) => {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  },
};

export default expensesAPI;
