'use strict';

const { redisClient } = require('../config/redisClient');
const keys = require('./keys');

const responseStore = {
  async saveResponse(roundId, questionId, username, responseData) {
    const key = keys.RESPONSE(roundId, questionId, username);
    await redisClient.hmset(key,
      'username', username,
      'roundId', roundId,
      'questionId', questionId,
      'answer', responseData.answer,
      'submittedAt', String(responseData.submittedAt || Date.now()),
      'isCorrect', String(responseData.isCorrect),
      'pointsAwarded', String(responseData.pointsAwarded || 0)
    );
    await redisClient.sadd(keys.RESPONSES(roundId, questionId), username);
  },

  async getResponse(roundId, questionId, username) {
    const response = await redisClient.hgetall(keys.RESPONSE(roundId, questionId, username));
    return response && Object.keys(response).length ? response : null;
  },

  async hasResponded(roundId, questionId, username) {
    return await redisClient.sismember(keys.RESPONSES(roundId, questionId), username);
  },

  async getRespondedUsers(roundId, questionId) {
    return await redisClient.smembers(keys.RESPONSES(roundId, questionId));
  },

  async clearRoundResponses(roundId) {
    const questionStore = require('./questionStore');
    const questionsOrder = await questionStore.getQuestionsOrder(roundId);
    
    for (const qId of questionsOrder) {
      const users = await this.getRespondedUsers(roundId, qId);
      for (const u of users) {
        await redisClient.del(keys.RESPONSE(roundId, qId, u));
      }
      await redisClient.del(keys.RESPONSES(roundId, qId));
    }
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
