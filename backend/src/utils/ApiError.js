/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = [], errorCode = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    // A machine-readable reason the client can act on (e.g. PASSWORD_CHANGE_REQUIRED).
    // Not `code`: that name belongs to Prisma errors in the error middleware.
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden', errorCode = undefined) {
    return new ApiError(403, message, [], errorCode);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static unprocessable(message, errors = []) {
    return new ApiError(422, message, errors);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
