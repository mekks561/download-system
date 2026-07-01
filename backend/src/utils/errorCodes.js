const ErrorCodes = {
  SUCCESS: {
    code: 0,
    message: '操作成功',
    statusCode: 200
  },
  
  VALIDATION_ERROR: {
    code: 1001,
    message: '参数验证失败',
    statusCode: 400
  },
  
  AUTHENTICATION_ERROR: {
    code: 2001,
    message: '未授权访问',
    statusCode: 401
  },
  
  INVALID_TOKEN: {
    code: 2002,
    message: '无效的令牌',
    statusCode: 401
  },
  
  TOKEN_EXPIRED: {
    code: 2003,
    message: '令牌已过期',
    statusCode: 401
  },
  
  AUTHORIZATION_ERROR: {
    code: 2004,
    message: '无权限执行此操作',
    statusCode: 403
  },
  
  RESOURCE_NOT_FOUND: {
    code: 3001,
    message: '资源不存在',
    statusCode: 404
  },
  
  DUPLICATE_RESOURCE: {
    code: 3002,
    message: '资源已存在',
    statusCode: 409
  },
  
  DATABASE_ERROR: {
    code: 4001,
    message: '数据库操作失败',
    statusCode: 500
  },
  
  FILE_OPERATION_ERROR: {
    code: 4002,
    message: '文件操作失败',
    statusCode: 500
  },
  
  NETWORK_ERROR: {
    code: 4003,
    message: '网络请求失败',
    statusCode: 500
  },
  
  INTERNAL_ERROR: {
    code: 5000,
    message: '服务器内部错误',
    statusCode: 500
  },
  
  RATE_LIMIT_EXCEEDED: {
    code: 6001,
    message: '请求过于频繁，请稍后重试',
    statusCode: 429
  },
  
  DOWNLOAD_ERROR: {
    code: 7001,
    message: '下载失败',
    statusCode: 500
  },
  
  UPLOAD_ERROR: {
    code: 7002,
    message: '上传失败',
    statusCode: 500
  },
  
  FILE_TOO_LARGE: {
    code: 7003,
    message: '文件大小超过限制',
    statusCode: 413
  }
};

class AppError extends Error {
  constructor(errorCode, details = null) {
    super(errorCode.message);
    this.name = 'AppError';
    this.errorCode = errorCode.code;
    this.statusCode = errorCode.statusCode;
    this.details = details;
  }
}

const createErrorResponse = (errorCode, details = null) => {
  return {
    success: false,
    code: errorCode.code,
    message: errorCode.message,
    details,
    timestamp: new Date().toISOString()
  };
};

const createSuccessResponse = (data = null, message = '操作成功') => {
  return {
    success: true,
    code: ErrorCodes.SUCCESS.code,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  ErrorCodes,
  AppError,
  createErrorResponse,
  createSuccessResponse
};