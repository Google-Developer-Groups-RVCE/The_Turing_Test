/**
 * logger.js
 * ------------------------------------------------------------------
 * Centralized structured logger for the whole backend, built on top
 * of Winston.
 *
 * Usage elsewhere:
 *   const logger = require('../utils/logger');
 *   logger.info('Server started', { port: 5000 });
 *   logger.error('Redis connection failed', { error: err.message });
 *
 * In development we log human-readable colorized lines to the console.
 * In production we log structured JSON, which is what you want when
 * logs are being scraped/aggregated by a cluster-level log collector.
 * ------------------------------------------------------------------
 */

'use strict';

const winston = require('winston');
const env = require('../config/env');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Human-friendly formatter used in development.
const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${ts}] ${level}: ${stack || message}${metaString}`;
  })
);

// Structured JSON formatter used in production (log-aggregator friendly).
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.IS_PRODUCTION ? prodFormat : devFormat,
  defaultMeta: { service: 'turing-test-backend' },
  transports: [
    new winston.transports.Console(),
  ],
  // Never let logging itself crash the process.
  exitOnError: false,
});

module.exports = logger;
