'use strict';

const { redisClient } = require('../config/redisClient');
const keys = require('./keys');

const questionStore = {
  async addQuestion(roundId, question) {
    const key = keys.QUESTION(roundId, question.id);
    const entries = Object.entries({
      id: question.id,
      text: question.text,
      prompt: question.prompt || question.text,
      type: question.type || 'mcq',
      options: JSON.stringify(question.options || []),
      correctAnswer: question.correctAnswer,
      points: String(question.points || 10),
      order: String(question.order || 1),
      showEvaluation: question.showEvaluation !== undefined ? String(question.showEvaluation) : 'true',
      imageUrl: question.imageUrl,
      imageProps: question.imageProps ? JSON.stringify(question.imageProps) : null,
      targetAge: question.targetAge,
      targetProfession: question.targetProfession,
      targetHobby: question.targetHobby,
      durationSeconds: question.durationSeconds ? String(question.durationSeconds) : null
    }).filter(([_, v]) => v !== undefined && v !== null && v !== 'null').map(([k, v]) => [k, String(v)]).flat();
    
    if (entries.length > 0) {
      await redisClient.hmset(key, ...entries);
    }
    const existingList = await redisClient.lrange(keys.QUESTIONS(roundId), 0, -1);
    if (!existingList.includes(String(question.id))) {
      await redisClient.rpush(keys.QUESTIONS(roundId), String(question.id));
    }
  },

  async getQuestion(roundId, questionId) {
    const question = await redisClient.hgetall(keys.QUESTION(roundId, questionId));
    if (question && Object.keys(question).length) {
      question.options = JSON.parse(question.options || '[]');
      if (question.imageProps) question.imageProps = JSON.parse(question.imageProps);
      if (question.showEvaluation !== undefined) question.showEvaluation = question.showEvaluation === 'true';
      return question;
    }
    return null;
  },

  async updateQuestion(roundId, questionId, updates) {
    const toUpdate = { ...updates };
    if (toUpdate.options) toUpdate.options = JSON.stringify(toUpdate.options);
    if (toUpdate.imageProps) toUpdate.imageProps = JSON.stringify(toUpdate.imageProps);
    const entries = Object.entries(toUpdate).filter(([_, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v ?? '')]).flat();
    if (entries.length > 0) {
      await redisClient.hmset(keys.QUESTION(roundId, questionId), ...entries);
    }
  },

  async deleteQuestion(roundId, questionId) {
    await redisClient.del(keys.QUESTION(roundId, questionId));
    await redisClient.lrem(keys.QUESTIONS(roundId), 0, questionId);
  },

  async getQuestionsOrder(roundId) {
    const rawList = await redisClient.lrange(keys.QUESTIONS(roundId), 0, -1);
    const uniqueList = Array.from(new Set(rawList));
    if (rawList.length !== uniqueList.length) {
      await redisClient.del(keys.QUESTIONS(roundId));
      if (uniqueList.length > 0) {
        await redisClient.rpush(keys.QUESTIONS(roundId), ...uniqueList);
      }
    }
    return uniqueList;
  },

  async setActiveQuestionId(roundId, questionId) {
    await redisClient.set(`round:${roundId}:active_question`, String(questionId));
  },

  async getActiveQuestionId(roundId) {
    return await redisClient.get(`round:${roundId}:active_question`);
  },
};

module.exports = questionStore;
