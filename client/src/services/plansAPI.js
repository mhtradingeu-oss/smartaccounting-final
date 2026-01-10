import api from './api';

export const fetchPublicPlans = async () => {
  const res = await api.get('/public/plans');
  return res.data;
};
