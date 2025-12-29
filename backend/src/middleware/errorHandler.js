const logger = require('../utils/logger');

// Zentralisiertes Error Handling
class ErrorHandler extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Spezifische Error-Types
class ValidationError extends ErrorHandler {
  constructor(message, field) {
    super(message, 400);
    this.type = 'VALIDATION_ERROR';
    this.field = field;
  }
}

class DatabaseError extends ErrorHandler {
  constructor(message, operation) {
    super(message, 500);
    this.type = 'DATABASE_ERROR';
    this.operation = operation;
  }
}

class AuthenticationError extends ErrorHandler {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.type = 'AUTH_ERROR';
  }
}

class AuthorizationError extends ErrorHandler {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.type = 'AUTHORIZATION_ERROR';
  }
}

// Error Handler Middleware
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error('Global Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ValidationError(message);
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = new ValidationError(message, field);
  }

  // Mongoose Cast Error
  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    error = new ValidationError(message);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AuthenticationError(message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AuthenticationError(message);
  }

  // Operational vs Programming Errors
  if (!error.isOperational && process.env.NODE_ENV === 'production') {
    // Don't leak error details in production for programming errors
    error = new ErrorHandler('Something went wrong', 500);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message,
      type: error.type || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: error
      })
    }
  });
};

// Async Error Handler Wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Not Found Handler
const notFoundHandler = (req, res, next) => {
  const error = new ErrorHandler(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

module.exports = {
  ErrorHandler,
  ValidationError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  globalErrorHandler,
  asyncHandler,
  notFoundHandler
};