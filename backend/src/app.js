/**
 * app.js
 * ------------------------------------------------------------------
 * Configures and exports the Express application itself.
 *
 * Deliberately separated from server.js so the Express app (routes,
 * middleware) can be imported and tested (e.g. with supertest)
 * without actually binding a port or opening real Socket.IO/Redis
 * connections.
 *
 * Scope of Module 1 (Backend Foundation):
 *   - global middleware (helmet, cors, compression, morgan, body parsing)
 *   - GET /health
 *   - 404 + centralized error handler
 *   NOTE: No feature routes (auth/users/rounds/...) are mounted here yet.
 *   Those are added module-by-module starting at Module 3.
 * ------------------------------------------------------------------
 */

'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const env = require('./config/env');
const logger = require('./utils/logger');
const { getRedisStatus } = require('./config/redisClient');
const { getSocketStatus } = require('./config/socket');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  // Record process start time so /health can report uptime precisely,
  // independent of process.uptime() rounding.
  const startedAt = Date.now();

  // --------------------------------------------------------------
  // Security headers
  // --------------------------------------------------------------
  app.use(helmet());

  // --------------------------------------------------------------
  // CORS — restrict to the known frontend origin(s), never "*",
  // per architecture Section 9 (Security Design).
  // --------------------------------------------------------------
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests with no origin (curl, server-to-server, health checks).
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        logger.warn(`[cors] blocked request from disallowed origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // --------------------------------------------------------------
  // Response compression
  // --------------------------------------------------------------
  app.use(compression());

  // --------------------------------------------------------------
  // Request logging
  // Dev: concise colored console output. Prod: combined/Apache-style,
  // piped through our structured logger instead of stdout directly.
  // --------------------------------------------------------------
  const morganFormat = env.IS_PRODUCTION ? 'combined' : 'dev';
  app.use(
    morgan(morganFormat, {
      stream: {
        write: (message) => logger.info(message.trim()),
      },
    })
  );

  // --------------------------------------------------------------
  // Body parsing
  // --------------------------------------------------------------
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // --------------------------------------------------------------
  // Trust proxy — required behind the NGINX Ingress controller so
  // req.ip / rate limiting see the real client IP, not the ingress IP.
  // --------------------------------------------------------------
  app.set('trust proxy', 1);

  // --------------------------------------------------------------
  // Health check route
  // Verifies: Express itself (implicit, by responding), Redis
  // connection status, Socket.IO status, and process uptime.
  // Used by Kubernetes liveness/readiness probes.
  // --------------------------------------------------------------
  const healthHandler = async (req, res) => {
    const redisStatus = getRedisStatus();
    const socketStatus = getSocketStatus();
    let uniqueOnlineUsers = 0;
    try {
      const { redisClient } = require('./config/redisClient');
      const keys = require('./redis/keys');
      uniqueOnlineUsers = await redisClient.scard(keys.PRESENCE_ONLINE);
    } catch { /* silent */ }

    const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);
    const healthy = redisStatus.healthy;
    const body = {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: uptimeSeconds,
      uptimeSeconds,
      redis: healthy ? 'ok' : 'error',
      memoryUsage: process.memoryUsage(),
      express: { healthy: true },
      redisDetail: redisStatus,
      socketIo: {
        ...socketStatus,
        connectedClients: typeof uniqueOnlineUsers === 'number' && uniqueOnlineUsers > 0 ? uniqueOnlineUsers : socketStatus.connectedClients,
        uniqueOnlineUsers
      },
    };
    res.status(healthy ? 200 : 503).json(body);
  };

  // Standard k8s health probe path
  app.get('/health', healthHandler);
  // Alias under /api for frontend convenience
  app.get('/api/health', healthHandler);

  // --------------------------------------------------------------
  // Feature routes
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/users', require('./routes/userRoutes'));
  app.use('/api/rounds', require('./routes/roundRoutes'));
  app.use('/api/event', require('./routes/eventRoutes'));
  app.use('/api/questions', require('./routes/questionRoutes'));
  app.use('/api/responses', require('./routes/responseRoutes'));
  app.use('/api/leaderboard', require('./routes/leaderboardRoutes'));
  app.use('/api/settings', require('./routes/settingsRoutes'));
  app.use('/api/logs', require('./routes/logRoutes'));
  // --------------------------------------------------------------

  // --------------------------------------------------------------
  // 404 + centralized error handler (must be registered LAST)
  // --------------------------------------------------------------
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
