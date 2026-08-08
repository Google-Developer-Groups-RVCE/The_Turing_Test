const { redisClient } = require('../../config/redisClient');
const keys = require('../../redis/keys');

const handleConnection = async (io, socket) => {
  if (!socket.user || !socket.user.username) return;
  const username = socket.user.username;
  await redisClient.sadd(keys.PRESENCE_ONLINE, username);
  
  const onlineCount = await redisClient.scard(keys.PRESENCE_ONLINE);
  io.emit('presence:online', { username, onlineCount });
};

const handleDisconnect = async (io, socket) => {
  if (!socket.user || !socket.user.username) return;
  const username = socket.user.username;
  await redisClient.srem(keys.PRESENCE_ONLINE, username);
  
  const onlineCount = await redisClient.scard(keys.PRESENCE_ONLINE);
  io.emit('presence:offline', { username, onlineCount });
};

module.exports = { handleConnection, handleDisconnect };
