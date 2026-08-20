'use strict';

const { redisClient } = require('../config/redisClient');

class R5Store {
  // --- Responses ---
  async saveResponse(username, text) {
    const multi = redisClient.multi();
    multi.hset('r5:responses', username, text);
    multi.sadd('r5:responded', username);
    await multi.exec();
  }

  async getResponse(username) {
    return await redisClient.hget('r5:responses', username);
  }

  async getAllResponses() {
    return await redisClient.hgetall('r5:responses');
  }

  async hasResponded(username) {
    return await redisClient.sismember('r5:responded', username);
  }

  async getRespondedUsers() {
    return await redisClient.smembers('r5:responded');
  }

  // --- Phase ---
  async setPhase(phase) {
    await redisClient.set('r5:phase', phase);
  }

  async getPhase() {
    return await redisClient.get('r5:phase');
  }

  // --- Gemini Response ---
  async setGeminiResponse(text) {
    await redisClient.set('r5:gemini', text);
  }

  async getGeminiResponse() {
    return await redisClient.get('r5:gemini');
  }

  // --- Shuffled Options ---
  async setShuffledOptions(options) {
    await redisClient.set('r5:shuffled', JSON.stringify(options));
  }

  async getShuffledOptions() {
    const data = await redisClient.get('r5:shuffled');
    return data ? JSON.parse(data) : null;
  }

  // --- Votes ---
  async saveVote(username, optionIndex) {
    const multi = redisClient.multi();
    multi.hset('r5:votes', username, optionIndex.toString());
    multi.sadd('r5:voted', username);
    await multi.exec();
  }

  async getVote(username) {
    return await redisClient.hget('r5:votes', username);
  }

  async getAllVotes() {
    return await redisClient.hgetall('r5:votes');
  }

  async hasVoted(username) {
    return await redisClient.sismember('r5:voted', username);
  }

  async getVotedUsers() {
    return await redisClient.smembers('r5:voted');
  }

  // --- Reset ---
  async clearAll() {
    await redisClient.del(
      'r5:responses',
      'r5:responded',
      'r5:gemini',
      'r5:shuffled',
      'r5:votes',
      'r5:voted',
      'r5:phase'
    );
  }
}

module.exports = new R5Store();
