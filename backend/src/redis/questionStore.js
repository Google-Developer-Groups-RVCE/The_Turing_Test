'use strict';

const { redisClient } = require('../config/redisClient');
const keys = require('./keys');

const questionStore = {
  async addQuestion(roundId, question) {
    const key = keys.QUESTION(roundId, question.id);
    const entries = Object.entries({
      id: question.id,
      text: question.text,
      type: question.type || 'mcq',
      options: JSON.stringify(question.options || []),
      correctAnswer: question.correctAnswer,
      points: String(question.points || 10),
      order: String(question.order || 1)
    }).filter(([_, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]).flat();
    
    if (entries.length > 0) {
      await redisClient.hmset(key, ...entries);
    }
    await redisClient.rpush(keys.QUESTIONS(roundId), question.id);
  },

  async getQuestion(roundId, questionId) {
    const question = await redisClient.hgetall(keys.QUESTION(roundId, questionId));
    if (question && Object.keys(question).length) {
      question.options = JSON.parse(question.options || '[]');
      return question;
    }
    return null;
  },

  async updateQuestion(roundId, questionId, updates) {
    const toUpdate = { ...updates };
    if (toUpdate.options) toUpdate.options = JSON.stringify(toUpdate.options);
    const entries = Object.entries(toUpdate).map(([k, v]) => [k, String(v ?? '')]).flat();
    if (entries.length > 0) {
      await redisClient.hmset(keys.QUESTION(roundId, questionId), ...entries);
    }
  },

  async deleteQuestion(roundId, questionId) {
    await redisClient.del(keys.QUESTION(roundId, questionId));
    await redisClient.lrem(keys.QUESTIONS(roundId), 0, questionId);
  },

  async getQuestionsOrder(roundId) {
    return await redisClient.lrange(keys.QUESTIONS(roundId), 0, -1);
  },
};

module.exports = questionStore;
