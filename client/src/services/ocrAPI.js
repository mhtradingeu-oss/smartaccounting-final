import api from './api';

export const previewDocument = async (file, documentType = 'invoice', companyId) => {
  const formData = new FormData();
  formData.append('document', file);
  if (documentType) {
    formData.append('documentType', documentType);
  }

  const response = await api.post('/ocr/preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(companyId ? { 'X-Company-Id': companyId } : {}),
    },
  });

  return response.data;
};

export const processDocument = async (file, documentType = 'invoice', companyId) => {
  const formData = new FormData();
  formData.append('document', file);
  if (documentType) {
    formData.append('documentType', documentType);
  }

  const response = await api.post('/ocr/process', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(companyId ? { 'X-Company-Id': companyId } : {}),
    },
  });

  return response.data;
};

export const analyzeIntake = async (file, options = {}) => {
  const { documentType = 'auto', languageHint = 'auto', userHint = '', companyId } = options;
  const formData = new FormData();
  formData.append('document', file);
  formData.append('documentType', documentType);
  formData.append('languageHint', languageHint);
  if (userHint) {
    formData.append('userHint', userHint);
  }

  const response = await api.post('/ocr/intake/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(companyId ? { 'X-Company-Id': companyId } : {}),
    },
  });

  return response.data;
};

const ocrAPI = {
  previewDocument,
  processDocument,
  analyzeIntake,
};

export default ocrAPI;
