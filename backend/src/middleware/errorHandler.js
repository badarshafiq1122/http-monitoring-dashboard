const logger = require("../utils/logger");
const config = require("../config");

// Custom error class for API errors
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

// 404 handler
function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.path}`,
    statusCode: 404,
  });
}

// Global error handler
function errorHandler(err, req, res, _next) {
  // Default to 500 if no status code set
  const statusCode = err.statusCode || 500;
  const isServerError = statusCode >= 500;

  // Log error with appropriate level
  if (isServerError) {
    logger.error("Server error", {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      statusCode,
    });
  } else {
    logger.warn("Client error", {
      error: err.message,
      path: req.path,
      method: req.method,
      statusCode,
    });
  }

  // Build error response
  const errorResponse = {
    error: isServerError ? "Internal Server Error" : err.message,
    message: err.message,
    statusCode,
  };

  // Include stack trace in development
  if (config.nodeEnv === "development" && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Include details if provided
  if (err.details) {
    errorResponse.details = err.details;
  }

  res.status(statusCode).json(errorResponse);
}

// Async handler wrapper to catch promise rejections
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  ApiError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
};
