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

const DEFAULT_AI_VOICE_ENABLED = normalizeFlag(import.meta.env.VITE_AI_VOICE_ENABLED ?? 'false');
let aiVoiceEnabled = DEFAULT_AI_VOICE_ENABLED;

export const isAIVoiceEnabled = () => aiVoiceEnabled;

export const setAIVoiceEnabled = (value) => {
  aiVoiceEnabled = normalizeFlag(value);
};

export const resetAIVoiceEnabled = () => {
  aiVoiceEnabled = DEFAULT_AI_VOICE_ENABLED;
};

const DEFAULT_AI_SUGGESTIONS_ENABLED = normalizeFlag(
  import.meta.env.VITE_AI_SUGGESTIONS_ENABLED ?? 'false',
);
let aiSuggestionsEnabled = DEFAULT_AI_SUGGESTIONS_ENABLED;

export const isAISuggestionsEnabled = () => aiSuggestionsEnabled;

export const setAISuggestionsEnabled = (value) => {
  aiSuggestionsEnabled = normalizeFlag(value);
};

export const resetAISuggestionsEnabled = () => {
  aiSuggestionsEnabled = DEFAULT_AI_SUGGESTIONS_ENABLED;
};
