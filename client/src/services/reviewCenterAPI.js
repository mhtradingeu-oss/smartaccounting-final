import api from './api';

const buildHeaders = (companyId) => ({
  ...(companyId ? { 'X-Company-Id': companyId } : {}),
});

export const reviewCenterAPI = {
  async getSummary({ companyId } = {}) {
    const response = await api.get('/review-center/summary', {
      headers: buildHeaders(companyId),
    });

    return response.data;
  },
};

export default reviewCenterAPI;
