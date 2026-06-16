import api from './api';

export function exportDATEV(params) {
  return api.get('/exports/datev', { params, responseType: 'blob' });
}
