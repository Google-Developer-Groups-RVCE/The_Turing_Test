const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const redisClient = require('../config/redisClient');
const socketAuth = require('./socketAuth');
const presenceHandlers = require('./handlers/presenceHandlers');
const responseHandlers = require('./handlers/responseHandlers');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST']
    }
  });

  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    presenceHandlers.handleConnection(io, socket);

    socket.on('response:submitted', (payload) => {
      responseHandlers.handleResponseSubmit(io, socket, payload);
    });

    socket.on('disconnect', () => {
      presenceHandlers.handleDisconnect(io, socket);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initSocket, getIO };
