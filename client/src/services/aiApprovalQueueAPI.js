import api from './api';

const buildHeaders = (companyId) => ({
  ...(companyId ? { 'X-Company-Id': companyId } : {}),
});

export const aiApprovalQueueAPI = {
  async list({ companyId } = {}) {
    const response = await api.get('/ai/approval-queue', {
      headers: buildHeaders(companyId),
    });

    return response.data;
  },
};

export default aiApprovalQueueAPI;
