/**
 * env.js
 * ------------------------------------------------------------------
 * Centralized environment variable loader and validator.
 *
 * Every other file in the backend should read configuration from this
 * module instead of touching `process.env` directly. This keeps all
 * env access in one place, gives us a single spot to add defaults /
 * validation, and makes it obvious what configuration the backend
 * actually depends on.
 * ------------------------------------------------------------------
 */

'use strict';

// Load variables from a local .env file in development.
// In Kubernetes/production, ConfigMaps + Secrets inject these directly
// as real environment variables, so dotenv simply finds nothing to do.
require('dotenv').config();

/**
 * Small helper to fetch a required env var and fail fast (with a clear
 * error) if it is missing, instead of the app starting in a broken
 * half-configured state.
 */
function requireEnv(name, fallback) {
  const value = process.env[name] !== undefined ? process.env[name] : fallback;
  if (value === undefined || value === null || value === '') {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Helper to parse a boolean-ish env var ("true"/"false"/"1"/"0").
 */
function parseBool(value, fallback) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true' || value === '1';
}

const NODE_ENV = process.env.NODE_ENV || 'development';

const env = {
  // ---- Core ----
  NODE_ENV,
  IS_PRODUCTION: NODE_ENV === 'production',
  IS_DEVELOPMENT: NODE_ENV === 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),

  // ---- CORS ----
  // Comma-separated list of allowed origins, e.g. "https://turing-test.gdgrvce.dev"
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173,http://turing-test.local,https://turing-test.local,https://nondefensible-helminthological-tennie.ngrok-free.dev',

  // ---- Redis ----
  REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  REDIS_DB: parseInt(process.env.REDIS_DB || '0', 10),
  // Whether to use TLS when connecting to Redis (some managed Redis providers require this).
  REDIS_TLS: parseBool(process.env.REDIS_TLS, false),

  // ---- Logging ----
  LOG_LEVEL: process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug'),

  // ---- Misc ----
  // Kept here for Module 3 (Authentication) — not used by Module 1, but declared
  // now so env.js does not need to change shape later.
  JWT_SECRET: process.env.JWT_SECRET || undefined,
};

// Fail fast in production if critical config is missing.
// We intentionally do NOT require JWT_SECRET here since auth is not part
// of Module 1 (Backend Foundation) — that check belongs to Module 3.
if (env.IS_PRODUCTION) {
  requireEnv('REDIS_HOST', env.REDIS_HOST);
}

module.exports = env;
