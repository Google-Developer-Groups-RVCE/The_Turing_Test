const { redisClient } = require('../../config/redisClient');
const keys = require('../../redis/keys');

const handleConnection = async (io, socket) => {
  if (!socket.user || !socket.user.username) return;
  const username = socket.user.username;
  const role = socket.user.role || 'participant';

  await redisClient.sadd(keys.PRESENCE_ONLINE, username);
  if (role === 'admin') {
    await redisClient.sadd('presence:admins', username);
  } else {
    if (socket.handshake?.query?.isSimulation !== 'true') {
      await redisClient.sadd('presence:participants', username);
    }
  }

  const [participantsCount, adminsCount] = await Promise.all([
    redisClient.scard('presence:participants'),
    redisClient.scard('presence:admins')
  ]);
  const onlineCount = participantsCount + adminsCount;
  
  const logStore = require('../../redis/logStore');
  await logStore.addLog({
    timestamp: Date.now(),
    level: 'info',
    action: 'SOCKET_CONNECT',
    adminUsername: username,
    details: `User connected via WebSocket: ${username} (${role})`
  });
  io.emit('log:new', { logEntry: { action: 'SOCKET_CONNECT', admin: username, timestamp: Date.now() } });

  io.emit('presence:online', {
    username,
    role,
    onlineCount,
    participantsCount,
    adminsCount
  });
};

const handleDisconnect = async (io, socket) => {
  if (!socket.user || !socket.user.username) return;
  const username = socket.user.username;
  const role = socket.user.role || 'participant';

  await redisClient.srem(keys.PRESENCE_ONLINE, username);
  await redisClient.srem('presence:admins', username);
  await redisClient.srem('presence:participants', username);

  const [participantsCount, adminsCount] = await Promise.all([
    redisClient.scard('presence:participants'),
    redisClient.scard('presence:admins')
  ]);
  const onlineCount = participantsCount + adminsCount;
  
  const logStore = require('../../redis/logStore');
  await logStore.addLog({
    timestamp: Date.now(),
    level: 'info',
    action: 'SOCKET_DISCONNECT',
    adminUsername: username,
    details: `User disconnected from WebSocket: ${username} (${role})`
  });
  io.emit('log:new', { logEntry: { action: 'SOCKET_DISCONNECT', admin: username, timestamp: Date.now() } });

  io.emit('presence:offline', {
    username,
    role,
    onlineCount,
    participantsCount,
    adminsCount
  });
};

module.exports = { handleConnection, handleDisconnect };
