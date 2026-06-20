const GREETING_PATTERNS = [
  'hi',
  'hello',
  'hey',
  'مرحبا',
  'مرحباً',
  'السلام عليكم',
  'هلا',
  'اهلا',
  'أهلا',
  'hallo',
  'guten tag',
];

const SMALL_TALK_PATTERNS = [
  'how are you',
  'how is it going',
  'thanks',
  'thank you',
  'شكرا',
  'شكرًا',
  'كيف حالك',
  'was kannst du',
  'what can you do',
];

export const normalizeUserMessage = (text = '') =>
  String(text)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const isGreetingMessage = (text = '') => {
  const normalized = normalizeUserMessage(text);
  if (!normalized) {
    return false;
  }
  return GREETING_PATTERNS.some(
    (pattern) => normalized === pattern || normalized.replace(/[!?.،؟]/g, '') === pattern,
  );
};

export const isGeneralSmallTalk = (text = '') => {
  const normalized = normalizeUserMessage(text);
  if (!normalized) {
    return false;
  }
  return SMALL_TALK_PATTERNS.some((pattern) => normalized.includes(pattern));
};

export const inferAssistantIntent = (text = '', selectedQuickAction = null) => {
  if (selectedQuickAction) {
    return selectedQuickAction;
  }
  const normalized = normalizeUserMessage(text);
  if (!normalized || isGreetingMessage(normalized) || isGeneralSmallTalk(normalized)) {
    return 'general_chat';
  }
  if (/(what|which|needs?|attention|priority|prioritize|review|مراجعة|انتباه|أولوية)/i.test(normalized)) {
    return 'review';
  }
  if (/(risk|risks|danger|issue|problem|anomal|خطر|مخاطر|مشكلة)/i.test(normalized)) {
    return 'risks';
  }
  if (/(transaction|payment|bank transaction|bank|explain|معاملة|دفعة|بنك|اشرح)/i.test(normalized)) {
    return 'explain_transaction';
  }
  if (/(why.*flag|flagged|alert|insight|why.*تنبيه|لماذا|سبب|اشعار|تنبيه)/i.test(normalized)) {
    return 'why_flagged';
  }
  return 'general_chat';
};

export const buildPromptForIntent = ({ text = '', intent, pageContext = null, attachments = [] }) => {
  const prompt = String(text || '').trim();
  const attachmentNote = attachments.length
    ? `\n\nAttachment context: ${attachments
        .map((item) => `${item.name || item.type || 'attachment'} (${item.kind || 'file'})`)
        .join(', ')}. File analysis is not connected yet; answer only from the user text and available read-only accounting context.`
    : '';
  const contextNote = pageContext?.company?.name
    ? `\n\nRead-only company context: ${pageContext.company.name}.`
    : '';
  if (intent === 'general_chat') {
    return `${prompt}${attachmentNote}${contextNote}`;
  }
  return `${prompt || intent}${attachmentNote}${contextNote}`;
};

export const formatAssistantAnswer = (answer = {}) => {
  if (typeof answer === 'string') {
    return { message: answer, highlights: [], requiredActions: [], references: [] };
  }
  return {
    ...answer,
    message: answer.message || answer.summary || 'The assistant has no data yet.',
    highlights: Array.isArray(answer.highlights) ? answer.highlights : [],
    risks: Array.isArray(answer.risks) ? answer.risks : [],
    requiredActions: Array.isArray(answer.requiredActions) ? answer.requiredActions : [],
    references: Array.isArray(answer.references) ? answer.references : [],
    evidenceReferences: Array.isArray(answer.evidenceReferences) ? answer.evidenceReferences : [],
  };
};

export const buildLocalGreetingAnswer = () => ({
  message:
    'مرحبًا، كيف أقدر أساعدك اليوم؟ يمكنني مراجعة الفواتير، المخاطر، المعاملات البنكية، أو شرح سبب ظهور تنبيه محاسبي.',
  highlights: [
    'Ask me what needs attention for a prioritized accounting review.',
    'Ask about risks, flagged items, payments, or bank transactions.',
  ],
  references: ['Read-only assistant guidance'],
  confidence: 'High',
});
