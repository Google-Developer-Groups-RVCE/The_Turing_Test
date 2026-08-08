const redisClient = require('../../config/redisClient');
const keys = require('../../redis/keys');

const handleConnection = async (io, socket) => {
  const username = socket.user.username;
  await redisClient.sAdd(keys.PRESENCE_ONLINE, username);
  
  const onlineCount = await redisClient.sCard(keys.PRESENCE_ONLINE);
  io.emit('presence:online', { username, onlineCount });
};

const handleDisconnect = async (io, socket) => {
  const username = socket.user.username;
  await redisClient.sRem(keys.PRESENCE_ONLINE, username);
  
  const onlineCount = await redisClient.sCard(keys.PRESENCE_ONLINE);
  io.emit('presence:offline', { username, onlineCount });
};

module.exports = { handleConnection, handleDisconnect };
