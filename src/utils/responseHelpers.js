const buildResponse = (res, payload, statusCode = 200) => {
  res.status(statusCode).json(payload);
};

const sendSuccess = (res, message = 'Success', data = {}, statusCode = 200) => {
  return buildResponse(res, {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  }, statusCode);
};

const sendCreated = (res, message = 'Created', data = {}) => {
  return sendSuccess(res, message, data, 201);
};

const sendError = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const payload = {
    success: false,
    error: message,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    payload.errors = errors;
  }

  return buildResponse(res, payload, statusCode);
};

const sendPaginatedResponse = (res, message, data = {}, pagination = {}) => {
  return sendSuccess(
    res,
    message,
    {
      ...data,
      pagination,
    },
  );
};

const sendNoContent = (res, message = 'Resource deleted successfully') => {
  return buildResponse(res, {
    success: true,
    message,
    timestamp: new Date().toISOString(),
  }, 204);
};

module.exports = {
  sendSuccess,
  sendError,
  sendCreated,
  sendPaginatedResponse,
  sendNoContent,
};
