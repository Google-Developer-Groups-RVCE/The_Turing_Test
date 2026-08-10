/**
 * socket.js
 * ------------------------------------------------------------------
 * Configures the base Socket.IO server instance and attaches the
 * Redis adapter so events broadcast from one backend pod are
 * delivered to clients connected to any other backend pod
 * (see architecture Section 1: multi-pod backend + Redis adapter).
 *
 * IMPORTANT (scope of Module 1 — Backend Foundation):
 *   This file only wires up the transport layer: server instance,
 *   CORS for the socket handshake, and the Redis adapter.
 *   It intentionally does NOT:
 *     - authenticate the socket handshake (that's socketAuth.js, Module 8)
 *     - register any event handlers (that's sockets/handlers/*, Module 8)
 *   We only expose a basic connection/disconnection log and a status
 *   getter so the /health route can report Socket.IO status.
 * ------------------------------------------------------------------
 */

'use strict';

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createRedisClient } = require('./redisClient');
const env = require('./env');
const logger = require('../utils/logger');

// Track whether the Redis adapter finished attaching, for health checks.
let socketIoReady = false;
let ioInstance = null;

/**
 * Initializes Socket.IO on top of the given raw HTTP server (the same
 * server Express listens on — see server.js) and attaches the Redis
 * pub/sub adapter.
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initSocket(httpServer) {
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  const isWildcard = allowedOrigins.includes('*');
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
        if (
          !origin ||
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(origin) ||
          origin.includes('ngrok') ||
          origin.endsWith('.ngrok-free.dev') ||
          origin.endsWith('.ngrok.io') ||
          origin.includes('turing-test.local')
        ) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'), false);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Very generous timeouts — we NEVER want to disconnect due to inactivity
    pingInterval: 10000,   // send heartbeat every 10s
    pingTimeout: 60000,    // allow 60s for response before disconnecting
    connectTimeout: 45000,
    transports: ['websocket', 'polling'],
  });

  // The Redis adapter needs two DEDICATED ioredis connections: one for
  // publishing, one for subscribing. They must be separate from the
  // main app's Redis client because a client in subscribe mode cannot
  // issue normal commands.
  const pubClient = createRedisClient('socket-pub');
  const subClient = createRedisClient('socket-sub');

  Promise.all([
    new Promise((resolve) => pubClient.once('ready', resolve)),
    new Promise((resolve) => subClient.once('ready', resolve)),
  ])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      socketIoReady = true;
      logger.info('[socket] Redis adapter attached — multi-pod broadcast enabled');
    })
    .catch((err) => {
      socketIoReady = false;
      logger.error(`[socket] failed to attach Redis adapter: ${err.message}`);
    });

  const socketAuth = require('../sockets/socketAuth');
  const presenceHandlers = require('../sockets/handlers/presenceHandlers');
  const responseHandlers = require('../sockets/handlers/responseHandlers');

  io.use(socketAuth);

  io.on('connection', (socket) => {
    logger.debug(`[socket] authenticated client connected: ${socket.id} (user: ${socket.user?.username})`);
    
    presenceHandlers.handleConnection(io, socket);

    socket.on('response:submitted', (payload) => {
      responseHandlers.handleResponseSubmit(io, socket, payload);
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`[socket] client disconnected: ${socket.id} (${reason})`);
      presenceHandlers.handleDisconnect(io, socket);
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Returns the current Socket.IO server instance (or null if not yet
 * initialized). Used by other modules that need to emit events.
 */
function getIO() {
  return ioInstance;
}

/**
 * Health snapshot for the /health route.
 */
function getSocketStatus() {
  return {
    initialized: ioInstance !== null,
    redisAdapterReady: socketIoReady,
    connectedClients: ioInstance ? ioInstance.engine.clientsCount : 0,
  };
}

module.exports = {
  initSocket,
  getIO,
  getSocketStatus,
};
