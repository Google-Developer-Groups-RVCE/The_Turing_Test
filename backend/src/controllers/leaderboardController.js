'use strict';

/**
 * leaderboardController.js
 * HTTP translation layer for all leaderboard endpoints.
 */

const leaderboardService = require('../services/leaderboardService');

class LeaderboardController {
  /** GET /leaderboard */
  async getOverallLeaderboard(req, res, next) {
    try {
      const leaderboard = await leaderboardService.getOverallLeaderboard();
      res.status(200).json({ leaderboard });
    } catch (err) {
      next(err);
    }
  }

  /** GET /leaderboard/:roundId */
  async getRoundLeaderboard(req, res, next) {
    try {
      const leaderboard = await leaderboardService.getRoundLeaderboard(req.params.roundId);
      res.status(200).json({ leaderboard });
    } catch (err) {
      next(err);
    }
  }

  /** POST /leaderboard/override — { username, score } */
  async overrideScore(req, res, next) {
    try {
      const { username, score } = req.body;
      if (!username || score === undefined) {
        return res.status(400).json({ message: 'username and score are required' });
      }
      await leaderboardService.overrideScore(username, Number(score), req.user.username);
      res.status(200).json({ message: 'Score overridden successfully' });
    } catch (err) {
      next(err);
    }
  }

  /** POST /leaderboard/reset */
  async resetLeaderboard(req, res, next) {
    try {
      await leaderboardService.resetLeaderboard(req.user.username);
      res.status(200).json({ message: 'Leaderboard reset' });
    } catch (err) {
      next(err);
    }
  }

  /** POST /leaderboard/recalculate */
  async recalculateLeaderboard(req, res, next) {
    try {
      await leaderboardService.recalculateLeaderboard(req.user.username);
      res.status(200).json({ message: 'Leaderboard recalculated from response data' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LeaderboardController();
