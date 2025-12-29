const normalizeFlag = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  return String(value ?? '').toLowerCase() === 'true';
};

const DEFAULT_BANK_IMPORT_ENABLED = normalizeFlag(import.meta.env.VITE_BANK_IMPORT_ENABLED);
let bankImportEnabled = DEFAULT_BANK_IMPORT_ENABLED;

export const isBankImportEnabled = () => bankImportEnabled;

export const setBankImportEnabled = (value) => {
  bankImportEnabled = normalizeFlag(value);
};

export const resetBankImportEnabled = () => {
  bankImportEnabled = DEFAULT_BANK_IMPORT_ENABLED;
};

const DEFAULT_OCR_PREVIEW_ENABLED = normalizeFlag(import.meta.env.VITE_OCR_PREVIEW_ENABLED);
let ocrPreviewEnabled = DEFAULT_OCR_PREVIEW_ENABLED;

export const isOCRPreviewEnabled = () => ocrPreviewEnabled;

export const setOCRPreviewEnabled = (value) => {
  ocrPreviewEnabled = normalizeFlag(value);
};

export const resetOCRPreviewEnabled = () => {
  ocrPreviewEnabled = DEFAULT_OCR_PREVIEW_ENABLED;
};

const DEFAULT_AI_ASSISTANT_ENABLED = normalizeFlag(import.meta.env.VITE_AI_ASSISTANT_ENABLED ?? 'true');
let aiAssistantEnabled = DEFAULT_AI_ASSISTANT_ENABLED;

export const isAIAssistantEnabled = () => aiAssistantEnabled;

export const setAIAssistantEnabled = (value) => {
  aiAssistantEnabled = normalizeFlag(value);
};

export const resetAIAssistantEnabled = () => {
  aiAssistantEnabled = DEFAULT_AI_ASSISTANT_ENABLED;
};
