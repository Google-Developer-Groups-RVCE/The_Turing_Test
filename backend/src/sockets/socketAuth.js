const { verifyToken } = require('../utils/jwtUtils');

const socketAuth = (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = verifyToken(token);
    socket.user = decoded; // attach user to socket
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
};

module.exports = socketAuth;
