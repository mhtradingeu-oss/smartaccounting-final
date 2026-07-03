import api from './api';

export async function getTaxBridgeReadiness(params = {}, options = {}) {
  const { companyId, ...queryParams } = params || {};
  const response = await api.get('/tax-bridge/readiness', {
    params: queryParams,
    signal: options.signal,
    headers: companyId ? { 'X-Company-Id': companyId } : undefined,
  });

  return response.data;
}

export default {
  getTaxBridgeReadiness,
};
