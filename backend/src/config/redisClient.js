/**
 * redisClient.js
 * ------------------------------------------------------------------
 * Creates and exports the single shared Redis client used by the
 * entire backend (Redis is our only datastore — see architecture
 * Section 5: Redis Design).
 *
 * This module is ONLY responsible for connection lifecycle:
 *   - connecting
 *   - reconnect strategy / backoff
 *   - exposing connection status
 *   - graceful disconnect
 *
 * It does NOT contain any domain logic or key access — that belongs
 * to the redis/*Store.js files added in Module 2 (Redis Data Layer).
 *
 * We use `ioredis` because it has a mature built-in reconnect
 * strategy and is what the Socket.IO Redis adapter (@socket.io/redis-adapter)
 * expects for its pub/sub clients.
 * ------------------------------------------------------------------
 */

'use strict';

const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

/**
 * Custom reconnect strategy.
 * ioredis calls this function every time the connection drops, passing
 * the number of attempts so far. We return the number of milliseconds
 * to wait before the next attempt (capped, so we don't hammer Redis or
 * wait forever), or an Error to stop retrying entirely.
 */
function retryStrategy(attempt) {
  const maxDelayMs = 10000; // never wait longer than 10s between attempts
  const baseDelayMs = 200;
  const delay = Math.min(attempt * baseDelayMs, maxDelayMs);

  logger.warn(`[redis] Reconnect attempt #${attempt}, retrying in ${delay}ms`);
  return delay;
}

/**
 * Factory so we can create more than one logical client with identical
 * config — the Socket.IO Redis adapter needs its own dedicated `pub`
 * and `sub` clients in addition to the main app client (a single
 * ioredis connection cannot both issue commands and stay subscribed).
 *
 * Supports two connection modes:
 *   1. REDIS_URL  (e.g. "rediss://user:pass@host:port") — used by Render
 *      Managed Redis and most cloud providers. Takes precedence when set.
 *   2. Individual vars: REDIS_HOST / REDIS_PORT / REDIS_PASSWORD — used
 *      in local Docker Compose and Kubernetes (via ConfigMap + Secret).
 */
function createRedisClient(label = 'main') {
  const redisUrl = process.env.REDIS_URL;

  const clientOptions = redisUrl
    ? {
        // Parse host/port/auth from the URL; TLS is implied by `rediss://` scheme.
        // ioredis accepts a URL string as the first constructor argument.
      }
    : {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
        db: env.REDIS_DB,
        tls: env.REDIS_TLS ? {} : undefined,
      };

  const sharedOptions = {
    // Reconnect behavior
    retryStrategy,
    // Queue commands issued while disconnected instead of throwing immediately.
    enableOfflineQueue: true,
    // Reconnect automatically if Redis sends a READONLY error (e.g. failover).
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET'];
      const shouldReconnect = targetErrors.some((code) => err.message.includes(code));
      if (shouldReconnect) {
        logger.warn(`[redis:${label}] reconnectOnError triggered: ${err.message}`);
      }
      return shouldReconnect;
    },
    maxRetriesPerRequest: null, // let retryStrategy own retry timing, never give up on a request
    connectTimeout: 10000,
    lazyConnect: false,
  };

  const client = redisUrl
    ? new Redis(redisUrl, sharedOptions)
    : new Redis({ ...clientOptions, ...sharedOptions });

  client.on('connect', () => {
    logger.info(`[redis:${label}] connecting to ${env.REDIS_HOST}:${env.REDIS_PORT}...`);
  });

  client.on('ready', () => {
    logger.info(`[redis:${label}] connection ready`);
  });

  client.on('error', (err) => {
    logger.error(`[redis:${label}] connection error: ${err.message}`);
  });

  client.on('close', () => {
    logger.warn(`[redis:${label}] connection closed`);
  });

  client.on('reconnecting', (delay) => {
    logger.warn(`[redis:${label}] reconnecting in ${delay}ms`);
  });

  client.on('end', () => {
    logger.warn(`[redis:${label}] connection ended — no more reconnects will be attempted`);
  });

  return client;
}

// The main application Redis client (used by redis/*Store.js in Module 2).
const redisClient = createRedisClient('main');

/**
 * Returns a simple health snapshot used by the /health route and by
 * Kubernetes readiness probes.
 */
function getRedisStatus() {
  // ioredis client.status is one of:
  // 'wait' | 'connecting' | 'connect' | 'ready' | 'close' | 'reconnecting' | 'end'
  return {
    status: redisClient.status,
    healthy: redisClient.status === 'ready',
  };
}

/**
 * Gracefully closes the main Redis connection. Used during graceful
 * shutdown in server.js.
 */
async function disconnectRedis() {
  try {
    await redisClient.quit();
    logger.info('[redis:main] disconnected cleanly');
  } catch (err) {
    logger.error(`[redis:main] error during disconnect, forcing: ${err.message}`);
    redisClient.disconnect();
  }
}

module.exports = {
  redisClient,
  createRedisClient,
  getRedisStatus,
  disconnectRedis,
};
