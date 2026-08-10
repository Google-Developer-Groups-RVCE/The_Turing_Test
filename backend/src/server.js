/**
 * server.js
 * ------------------------------------------------------------------
 * Entry point of the backend process.
 *
 * Responsibilities (and ONLY these — business logic never lives here):
 *   1. Build the Express app (app.js)
 *   2. Create a raw Node HTTP server wrapping it
 *   3. Attach Socket.IO to that same HTTP server (config/socket.js)
 *   4. Start listening on PORT
 *   5. Wire up graceful shutdown (SIGTERM/SIGINT, uncaught errors)
 *
 * Sharing one HTTP server between Express and Socket.IO is what lets
 * both HTTP and WebSocket traffic go through the same Kubernetes
 * Service/port (see architecture Section 1).
 * ------------------------------------------------------------------
 */

'use strict';

const http = require('http');

const createApp = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { redisClient, disconnectRedis } = require('./config/redisClient');
const { initSocket } = require('./config/socket');

const userStore = require('./redis/userStore');
const { hashPassword } = require('./utils/hashPassword');

async function autoSeed() {
  try {
    const adminUsernames = ['a', 'A', 'aa', 'AA', 'admin'];
    for (const u of adminUsernames) {
      const hashed = await hashPassword(u.toLowerCase());
      await userStore.createUser({
        username: u,
        passwordHash: hashed,
        role: 'admin',
        name: 'Super Admin',
        createdAt: Date.now().toString(),
        status: 'active'
      });
      logger.info(`[autoSeed] Admin user '${u}' seeded/reset.`);
    }

    const participantUsernames = ['b', 'B', 'bb', 'BB', 'user', 'participant'];
    for (const u of participantUsernames) {
      const pHashed = await hashPassword(u.toLowerCase());
      await userStore.createUser({
        username: u,
        passwordHash: pHashed,
        role: 'participant',
        name: `Test Participant ${u}`,
        createdAt: Date.now().toString(),
        status: 'active'
      });
      logger.info(`[autoSeed] Participant user '${u}' seeded/reset.`);
    }

    const roundStore = require('./redis/roundStore');
    const rounds = await roundStore.getRoundsOrder();
    if (!rounds || rounds.length === 0) {
      const defaultRound = {
        id: `r_${Date.now()}`,
        name: 'Round 1: Turing Test',
        durationSeconds: 300,
        status: 'active'
      };
      await roundStore.createRound(defaultRound);
      await roundStore.setCurrentRound(defaultRound.id);
      logger.info(`[autoSeed] Default Round 1 seeded successfully.`);
    }
  } catch (err) {
    logger.warn(`[autoSeed] Skipping automatic seeding: ${err.message}`);
  }
}

// --------------------------------------------------------------------
// Bootstrap
// --------------------------------------------------------------------
const app = createApp();
const httpServer = http.createServer(app);
const io = initSocket(httpServer);

let isShuttingDown = false;

httpServer.listen(env.PORT, () => {
  logger.info(`[server] Turing Test backend listening on port ${env.PORT} (${env.NODE_ENV})`);
  logger.info(`[server] CORS origin(s): ${env.CORS_ORIGIN}`);
  autoSeed();
});

// --------------------------------------------------------------------
// Graceful shutdown
// --------------------------------------------------------------------
// Kubernetes sends SIGTERM before killing a pod (e.g. during a rolling
// deploy or scale-down). We must stop accepting new work, let
// in-flight requests/sockets finish, close Redis cleanly, and only
// then exit — otherwise requests get dropped mid-flight and Redis
// connections can leak or corrupt data.
async function gracefulShutdown(signal) {
  if (isShuttingDown) return; // avoid double-shutdown if signal fires twice
  isShuttingDown = true;

  logger.info(`[server] Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new HTTP connections; let existing ones finish.
  const httpCloseTimeout = setTimeout(() => {
    logger.error('[server] Forced shutdown — HTTP server did not close in time');
    process.exit(1);
  }, 10000);
  httpCloseTimeout.unref();

  httpServer.close(async (err) => {
    clearTimeout(httpCloseTimeout);
    if (err) {
      logger.error(`[server] Error while closing HTTP server: ${err.message}`);
    } else {
      logger.info('[server] HTTP server closed');
    }

    try {
      // Close all Socket.IO connections gracefully.
      await new Promise((resolve) => io.close(resolve));
      logger.info('[server] Socket.IO server closed');
    } catch (socketErr) {
      logger.error(`[server] Error while closing Socket.IO: ${socketErr.message}`);
    }

    try {
      await disconnectRedis();
    } catch (redisErr) {
      logger.error(`[server] Error while disconnecting Redis: ${redisErr.message}`);
    }

    logger.info('[server] Shutdown complete. Bye 👋');
    process.exit(0);
  });
}

// Kubernetes / process managers send SIGTERM; Ctrl+C sends SIGINT.
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Safety nets: log and shut down cleanly instead of leaving the
// process in a corrupted/unknown state.
process.on('unhandledRejection', (reason) => {
  logger.error('[server] Unhandled Promise Rejection', { reason: reason && reason.stack || reason });
});

process.on('uncaughtException', (err) => {
  logger.error('[server] Uncaught Exception — shutting down', { error: err.stack });
  gracefulShutdown('uncaughtException');
});

module.exports = { httpServer, app, io, redisClient };
