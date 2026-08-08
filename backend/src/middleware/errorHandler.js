/**
 * errorHandler.js
 * ------------------------------------------------------------------
 * Single centralized place that formats every error thrown anywhere
 * in the Express app into a consistent JSON response.
 *
 * Usage pattern going forward (Modules 3+):
 *   - Route handlers/controllers call `next(err)` (or throw inside an
 *     async handler wrapped in a catch) instead of building their own
 *     error responses.
 *   - `err.statusCode` and `err.code` can be set on custom error
 *     classes to control the HTTP status and machine-readable code.
 *
 * This file also exports a `notFoundHandler` for unmatched routes and
 * an `AppError` base class other modules can extend/throw.
 * ------------------------------------------------------------------
 */

'use strict';

const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Base class for predictable, intentional application errors.
 * e.g. `throw new AppError('Round not found', 404, 'ROUND_NOT_FOUND')`
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // distinguishes expected errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 handler — placed after all routes, before errorHandler.
 * Converts "no route matched" into a normal AppError so it flows
 * through the same formatting logic as everything else.
 */
function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

/**
 * Final centralized error-handling middleware.
 * Must be registered LAST, after all routes and other middleware, and
 * must declare all four (err, req, res, next) arguments for Express to
 * recognize it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const isOperational = err.isOperational === true;

  // Log full detail server-side always. Unexpected (non-operational)
  // errors get logged at 'error' level with a stack trace; expected
  // AppErrors get a quieter 'warn' log.
  if (isOperational) {
    logger.warn(`[error] ${req.method} ${req.originalUrl} -> ${statusCode} ${code}: ${err.message}`);
  } else {
    logger.error(`[error] ${req.method} ${req.originalUrl} -> ${statusCode}: ${err.message}`, {
      stack: err.stack,
    });
  }

  const responseBody = {
    success: false,
    error: {
      code,
      message: err.message || 'Something went wrong',
    },
  };

  // Never leak stack traces or internal details in production responses.
  if (!env.IS_PRODUCTION && err.stack) {
    responseBody.error.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
};
