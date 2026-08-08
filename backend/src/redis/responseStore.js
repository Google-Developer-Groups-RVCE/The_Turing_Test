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

  async clearRoundResponses(roundId) {
    const users = await this.getRespondedUsers(roundId);
    for (const u of users) {
      await redisClient.del(keys.RESPONSE(roundId, u));
    }
    await redisClient.del(keys.RESPONSES(roundId));
  },

  async clearAllResponses() {
    const keysToDel = await redisClient.keys('response:*');
    if (keysToDel && keysToDel.length > 0) {
      await redisClient.del(...keysToDel);
    }
    const setKeysToDel = await redisClient.keys('responses:*');
    if (setKeysToDel && setKeysToDel.length > 0) {
      await redisClient.del(...setKeysToDel);
    }
  },
};

module.exports = responseStore;
