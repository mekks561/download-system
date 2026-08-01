const { logger } = require('../utils/logger');
const { ErrorCodes, createErrorResponse } = require('../utils/errorCodes');

const errorHandler = (err, req, res, next) => {
  const errorInfo = {
    message: err.message,
    errorCode: err.errorCode || ErrorCodes.INTERNAL_ERROR.code,
    statusCode: err.statusCode || 500,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body ? JSON.stringify(req.body) : null,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    details: err.details
  };

  logger.error('Request error', errorInfo);

  if (err instanceof require('../utils/errorCodes').AppError) {
    res.status(err.statusCode).json(createErrorResponse({
      code: err.errorCode,
      message: err.message,
      statusCode: err.statusCode
    }, err.details));
  } else {
    const statusCode = err.statusCode || 500;
    let errorCode = ErrorCodes.INTERNAL_ERROR;
    
    if (statusCode === 400) errorCode = ErrorCodes.VALIDATION_ERROR;
    if (statusCode === 401) errorCode = ErrorCodes.AUTHENTICATION_ERROR;
    if (statusCode === 403) errorCode = ErrorCodes.AUTHORIZATION_ERROR;
    if (statusCode === 404) errorCode = ErrorCodes.RESOURCE_NOT_FOUND;
    
    res.status(statusCode).json(createErrorResponse(errorCode));
  }
};

const notFound = (req, res) => {
  const errorInfo = {
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  logger.warn('Route not found', errorInfo);

  res.status(404).json(createErrorResponse(ErrorCodes.RESOURCE_NOT_FOUND));
};

module.exports = { errorHandler, notFound };
