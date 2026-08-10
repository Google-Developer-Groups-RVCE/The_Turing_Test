'use strict';

const { redisClient } = require('../config/redisClient');
const keys = require('./keys');

const userStore = {
  async createUser(user) {
    const key = keys.USER(user.username);
    await redisClient.hmset(key,
      'username', user.username,
      'passwordHash', user.passwordHash,
      'role', user.role,
      'name', user.name || '',
      'createdAt', user.createdAt,
      'status', user.status || 'active'
    );
    await redisClient.sadd(keys.USERNAMES, user.username);
    if (user.role === 'admin') {
      await redisClient.sadd(keys.ADMINS, user.username);
    }
  },

  async getUser(username) {
    const user = await redisClient.hgetall(keys.USER(username));
    return user && Object.keys(user).length ? user : null;
  },

  async updateUser(username, updates) {
    const entries = Object.entries(updates).flat();
    if (entries.length > 0) {
      await redisClient.hmset(keys.USER(username), ...entries);
    }
  },

  async deleteUser(username, role) {
    await redisClient.del(keys.USER(username));
    await redisClient.srem(keys.USERNAMES, username);
    if (role === 'admin') {
      await redisClient.srem(keys.ADMINS, username);
    }
  },

  async usernameExists(username) {
    return await redisClient.sismember(keys.USERNAMES, username);
  },

  async getAllUsernames() {
    return await redisClient.smembers(keys.USERNAMES);
  },
};

module.exports = userStore;
