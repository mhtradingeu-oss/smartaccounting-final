const DEFAULT_ERROR_CODE = 'AI_REQUEST_FAILED';
const DEFAULT_MESSAGE = 'AI request failed';

const ERROR_CODE_BY_STATUS = {
  400: 'BAD_REQUEST',
  403: 'FORBIDDEN',
  405: 'METHOD_NOT_ALLOWED',
  413: 'INPUT_TOO_LARGE',
  500: DEFAULT_ERROR_CODE,
  501: 'NOT_IMPLEMENTED',
};

const buildAIErrorPayload = ({
  errorCode,
  message,
  requestId,
  includeError = true,
  extra = {},
} = {}) => {
  const payload = {
    errorCode: errorCode || DEFAULT_ERROR_CODE,
    message: message || DEFAULT_MESSAGE,
    requestId: requestId || 'unknown',
  };
  if (includeError) {
    payload.error = payload.message;
  }
  return { ...payload, ...extra };
};

const sendAIError = (res, { status = 500, errorCode, message, requestId, extra } = {}) =>
  res
    .status(status)
    .json(
      buildAIErrorPayload({
        errorCode: errorCode || ERROR_CODE_BY_STATUS[status],
        message,
        requestId,
        extra,
      }),
    );

module.exports = { sendAIError, buildAIErrorPayload };
