import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';

/**
 * Central Error Handling Middleware
 * Ensures uniform error response format and zero leakage of stack traces or sensitive internals.
 */
export const errorHandler = (err, req, res, next) => {
  const correlationId = req.correlationId || 'unknown';
  const statusCode = err.statusCode || err.status || 500;
  
  // Log diagnostic detail securely on the server
  logger.error(`[Error] ${req.method} ${req.originalUrl} - ${err.message}`, {
    correlationId,
    statusCode,
    stack: config.env === 'development' ? err.stack : undefined,
  });

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File exceeds maximum allowed size of ${Math.round(config.maxFileSize / (1024 * 1024))}MB.`,
          correlationId,
        },
      });
    }
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message,
        correlationId,
      },
    });
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid request payload.',
        details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        correlationId,
      },
    });
  }

  // Handle Mongoose CastError / ValidationError
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Resource identifier format is invalid.',
        correlationId,
      },
    });
  }

  // Generic sanitized response
  const clientMessage = statusCode >= 500 
    ? 'An unexpected internal server error occurred. Please try again later.'
    : err.message || 'An error occurred processing your request.';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
      message: clientMessage,
      correlationId,
    },
  });
};

/**
 * 404 Route Not Found Middleware
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The endpoint ${req.method} ${req.originalUrl} does not exist.`,
      correlationId: req.correlationId,
    },
  });
};
