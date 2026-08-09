'use strict';

const { redisClient } = require('../config/redisClient');
const keys = require('./keys');

const roundStore = {
  async createRound(round) {
    const key = keys.ROUND(round.id);
    await redisClient.hmset(key,
      'id', round.id,
      'name', round.name,
      'status', round.status || 'pending',
      'startedAt', round.startedAt || '',
      'endedAt', round.endedAt || '',
      'durationSeconds', String(round.durationSeconds || 300),
      'order', String(round.order || Date.now())
    );
    await redisClient.rpush(keys.ROUNDS_ORDER, round.id);
  },

  async getRound(roundId) {
    const round = await redisClient.hgetall(keys.ROUND(roundId));
    return round && Object.keys(round).length ? round : null;
  },

  async updateRound(roundId, updates) {
    const entries = Object.entries(updates).map(([k, v]) => [k, String(v ?? '')]).flat();
    if (entries.length > 0) {
      await redisClient.hmset(keys.ROUND(roundId), ...entries);
    }
  },

  async deleteRound(roundId) {
    await redisClient.del(keys.ROUND(roundId));
    await redisClient.lrem(keys.ROUNDS_ORDER, 0, roundId);
  },

  async getRoundsOrder() {
    return await redisClient.lrange(keys.ROUNDS_ORDER, 0, -1);
  },

  async setCurrentRound(roundId) {
    if (roundId) {
      await redisClient.set(keys.CURRENT_ROUND, roundId);
    } else {
      await redisClient.del(keys.CURRENT_ROUND);
    }
  },

  async getCurrentRound() {
    return await redisClient.get(keys.CURRENT_ROUND);
  },

  async setEventState(status, updatedBy) {
    await redisClient.hmset(keys.EVENT_STATE,
      'status', status,
      'updatedAt', String(Date.now()),
      'updatedBy', updatedBy || 'system'
    );
  },

  async getEventState() {
    const state = await redisClient.hgetall(keys.EVENT_STATE);
    return state && Object.keys(state).length ? state : null;
  },

  async setActiveStage(roundId, stage) {
    await redisClient.hset(keys.ROUND(roundId), 'activeStage', stage);
  },

  async getActiveStage(roundId) {
    return await redisClient.hget(keys.ROUND(roundId), 'activeStage');
  }
};

module.exports = roundStore;

