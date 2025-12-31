const { ApiError } = require('../utils');

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Handle Prisma errors
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        // Unique constraint violation
        statusCode = 409;
        message = 'A record with this value already exists';
        const target = err.meta?.target;
        if (target) {
          message = `A record with this ${Array.isArray(target) ? target.join(', ') : target} already exists`;
        }
        break;
      case 'P2025':
        // Record not found
        statusCode = 404;
        message = 'Record not found';
        break;
      case 'P2003':
        // Foreign key constraint violation
        statusCode = 400;
        message = 'Related record not found';
        break;
      case 'P2014':
        // Required relation violation
        statusCode = 400;
        message = 'Required relation constraint violated';
        break;
      default:
        // Other Prisma errors
        if (err.code.startsWith('P')) {
          statusCode = 400;
          message = 'Database operation failed';
        }
    }
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors || {}).map((e) => e.message);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
    errors = [];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
};

module.exports = {
  notFound,
  errorHandler,
};
