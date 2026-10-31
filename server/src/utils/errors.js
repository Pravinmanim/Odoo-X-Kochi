export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST', fields = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', fields = null) {
    super(message, 404, 'NOT_FOUND', fields);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', fields = null) {
    super(message, 401, 'UNAUTHORIZED', fields);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access', fields = null) {
    super(message, 403, 'FORBIDDEN', fields);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', fields = null) {
    super(message, 409, 'CONFLICT', fields);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', fields = null) {
    super(message, 422, 'VALIDATION_ERROR', fields);
  }
}

