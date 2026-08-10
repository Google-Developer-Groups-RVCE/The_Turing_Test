'use strict';

/**
 * leaderboardService.js
 * Business logic for the leaderboard: update, override, reset, recalculate.
 * Uses Redis Sorted Sets for O(log N) ranked retrieval.
 */

const leaderboardStore = require('../redis/leaderboardStore');
const responseStore = require('../redis/responseStore');
const questionStore = require('../redis/questionStore');
const roundStore = require('../redis/roundStore');
const userStore = require('../redis/userStore');
const logStore = require('../redis/logStore');

// Lazy-load IO to avoid circular dependency
const getIO = () => {
  try { return require('../sockets/socketServer').getIO(); } catch { return null; }
};

class LeaderboardService {
  /**
   * Add points to a user's overall and per-round leaderboard.
   * Broadcasts leaderboard:update to all clients.
   */
  async updateScore(username, roundId, pointsToAdd) {
    await leaderboardStore.updateScore(username, pointsToAdd);
    await leaderboardStore.updateRoundScore(roundId, username, pointsToAdd);
    const leaderboard = await this.getOverallLeaderboard();
    getIO()?.emit('leaderboard:update', { leaderboard });
  }

  /** Return the overall leaderboard (top 200) with user names enriched. */
  async getOverallLeaderboard() {
    const entries = await leaderboardStore.getTop(200);
    return this._enrichEntries(entries);
  }

  /** Return per-round leaderboard (top 200). */
  async getRoundLeaderboard(roundId) {
    const entries = await leaderboardStore.getRoundTop(roundId, 200);
    return this._enrichEntries(entries);
  }

  /**
   * Admin: directly set a user's overall score.
   */
  async overrideScore(username, newScore, adminUsername) {
    const { redisClient } = require('../config/redisClient');
    const keys = require('../redis/keys');
    // ZADD with exact score (replaces existing)
    await redisClient.zadd(keys.LEADERBOARD, newScore, username);
    await logStore.addLog({
      admin: adminUsername,
      action: 'OVERRIDE_SCORE',
      target: username,
      level: 'warn',
      timestamp: Date.now(),
    });
    const leaderboard = await this.getOverallLeaderboard();
    getIO()?.emit('leaderboard:update', { leaderboard });
  }

  /** Admin: wipe both overall and all per-round leaderboards. */
  async resetLeaderboard(adminUsername) {
    await leaderboardStore.resetLeaderboard();
    // Also reset all per-round sorted sets
    const order = await roundStore.getRoundsOrder();
    const { redisClient } = require('../config/redisClient');
    const keys = require('../redis/keys');
    for (const id of order) {
      await redisClient.del(keys.LEADERBOARD_ROUND(id));
    }
    await logStore.addLog({
      admin: adminUsername,
      action: 'RESET_LEADERBOARD',
      target: 'all',
      level: 'warn',
      timestamp: Date.now(),
    });
    getIO()?.emit('leaderboard:update', { leaderboard: [] });
  }

  /**
   * Admin: rebuild the entire leaderboard from stored response data.
   * Useful if leaderboard gets out of sync.
   */
  async recalculateLeaderboard(adminUsername) {
    // Reset first
    await leaderboardStore.resetLeaderboard();
    const { redisClient } = require('../config/redisClient');
    const keys = require('../redis/keys');

    const rounds = await roundStore.getRoundsOrder();
    for (const roundId of rounds) {
      const questionsOrder = await questionStore.getQuestionsOrder(roundId);
      for (const questionId of questionsOrder) {
        const respondedUsers = await responseStore.getRespondedUsers(roundId, questionId);
        for (const username of respondedUsers) {
          const response = await responseStore.getResponse(roundId, questionId, username);
          if (response && response.pointsAwarded && Number(response.pointsAwarded) > 0) {
            await redisClient.zincrby(keys.LEADERBOARD, Number(response.pointsAwarded), username);
            await redisClient.zincrby(keys.LEADERBOARD_ROUND(roundId), Number(response.pointsAwarded), username);
          }
        }
      }
    }

    await logStore.addLog({
      admin: adminUsername,
      action: 'RECALCULATE_LEADERBOARD',
      target: 'all',
      level: 'info',
      timestamp: Date.now(),
    });

    const leaderboard = await this.getOverallLeaderboard();
    getIO()?.emit('leaderboard:update', { leaderboard });
    return leaderboard;
  }

  /** Enrich leaderboard entries with user name from Redis. */
  async _enrichEntries(entries) {
    const enriched = await Promise.all(
      entries
        .filter(e => (e.value || e.username) !== 'simulated_user')
        .map(async (e) => {
          const user = await userStore.getUser(e.value || e.username);
          return {
            username: e.value || e.username,
            name: user?.name || e.value || e.username,
            score: Number(e.score),
          };
        })
    );
    return enriched;
  }
}

module.exports = new LeaderboardService();
