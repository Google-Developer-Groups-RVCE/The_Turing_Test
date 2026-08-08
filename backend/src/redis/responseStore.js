'use strict';

const { redisClient } = require('../config/redisClient');
const keys = require('./keys');

const responseStore = {
  async saveResponse(roundId, username, responseData) {
    const key = keys.RESPONSE(roundId, username);
    await redisClient.hmset(key,
      'username', username,
      'roundId', roundId,
      'answer', responseData.answer,
      'submittedAt', String(responseData.submittedAt || Date.now()),
      'isCorrect', String(responseData.isCorrect),
      'pointsAwarded', String(responseData.pointsAwarded || 0)
    );
    await redisClient.sadd(keys.RESPONSES(roundId), username);
  },

  async getResponse(roundId, username) {
    const response = await redisClient.hgetall(keys.RESPONSE(roundId, username));
    return response && Object.keys(response).length ? response : null;
  },

  async hasResponded(roundId, username) {
    return await redisClient.sismember(keys.RESPONSES(roundId), username);
  },

  async getRespondedUsers(roundId) {
    return await redisClient.smembers(keys.RESPONSES(roundId));
  },
};

module.exports = responseStore;
