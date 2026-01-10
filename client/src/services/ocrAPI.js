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

const ocrAPI = {
  previewDocument,
  processDocument,
};

export default ocrAPI;
