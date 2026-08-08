'use strict';

/**
 * leaderboardRoutes.js
 * Overall and per-round leaderboard endpoints including override, reset, recalculate.
 */

const express = require('express');
const leaderboardController = require('../controllers/leaderboardController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(authMiddleware);

// Read: participant + admin
router.get('/', leaderboardController.getOverallLeaderboard);
router.get('/:roundId', leaderboardController.getRoundLeaderboard);

// Write: admin only
router.post('/override', roleMiddleware('admin'), leaderboardController.overrideScore);
router.post('/reset', roleMiddleware('admin'), leaderboardController.resetLeaderboard);
router.post('/recalculate', roleMiddleware('admin'), leaderboardController.recalculateLeaderboard);

module.exports = router;
