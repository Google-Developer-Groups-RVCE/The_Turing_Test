'use strict';

/**
 * leaderboardStore.js
 * Redis Sorted Set operations for leaderboard management.
 * Sorted sets give O(log N) insert, O(log N + M) range retrieval.
 */

const { redisClient } = require('../config/redisClient');
const keys = require('./keys');

const leaderboardStore = {
  /** Increment a user's overall score atomically. */
  async updateScore(username, pointsToAdd) {
    await redisClient.zincrby(keys.LEADERBOARD, pointsToAdd, username);
  },

  /** Increment a user's per-round score atomically. */
  async updateRoundScore(roundId, username, pointsToAdd) {
    await redisClient.zincrby(keys.LEADERBOARD_ROUND(roundId), pointsToAdd, username);
  },

  /**
   * Get top-N overall entries in descending score order.
   * Returns: [{ value: username, score: Number }, ...]
   */
  async getTop(limit = 200) {
    const result = await redisClient.zrevrangebyscore(
      keys.LEADERBOARD, '+inf', '-inf', 'WITHSCORES', 'LIMIT', 0, limit
    );
    return leaderboardStore._parseZrevrangebyscore(result);
  },

  /**
   * Get top-N per-round entries in descending score order.
   */
  async getRoundTop(roundId, limit = 200) {
    const result = await redisClient.zrevrangebyscore(
      keys.LEADERBOARD_ROUND(roundId), '+inf', '-inf', 'WITHSCORES', 'LIMIT', 0, limit
    );
    return leaderboardStore._parseZrevrangebyscore(result);
  },

  /** Wipe the overall leaderboard sorted set. */
  async resetLeaderboard() {
    await redisClient.del(keys.LEADERBOARD);
  },

  /** Wipe a per-round leaderboard sorted set. */
  async resetRoundLeaderboard(roundId) {
    await redisClient.del(keys.LEADERBOARD_ROUND(roundId));
  },

  /**
   * Parse ioredis ZREVRANGEBYSCORE WITHSCORES output.
   * ioredis returns a flat array: [member1, score1, member2, score2, ...]
   */
  _parseZrevrangebyscore(raw) {
    const result = [];
    for (let i = 0; i < raw.length; i += 2) {
      result.push({ value: raw[i], score: Number(raw[i + 1]) });
    }
    return result;
  },
};

module.exports = leaderboardStore;
