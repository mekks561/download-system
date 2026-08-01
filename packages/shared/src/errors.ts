export const ErrorCode = {
  VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR' },
  UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN' },
  NOT_FOUND: { status: 404, code: 'NOT_FOUND' },
  CONFLICT: { status: 409, code: 'CONFLICT' },
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED' },
  DOWNLOAD_FAILED: { status: 500, code: 'DOWNLOAD_FAILED' },
  INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR' },
} as const;

export type ErrorCodeKey = keyof typeof ErrorCode;
export type ErrorDef = (typeof ErrorCode)[ErrorCodeKey];
