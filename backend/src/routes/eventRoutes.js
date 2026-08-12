'use strict';

const express = require('express');
const roundController = require('../controllers/roundController');
const seedService = require('../services/seedService');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// POST /api/event/reset — Reset all rounds to pending state
router.post('/reset', roundController.resetEvent);

// POST /api/event/end — End the entire event
router.post('/end', roundController.endEvent);



// POST /api/event/inject-preset — Inject preset round 1, 2, 3 or all individually without editing existing rounds
router.post('/inject-preset', async (req, res, next) => {
  try {
    const { roundNumber } = req.body;
    const result = await seedService.injectPresetRound(roundNumber, req.user?.username);
    res.status(200).json(result);
  } catch (err) { next(err); }
});

// DELETE /api/event/clear-data — Wipe all live responses and reset leaderboard
router.delete('/clear-data', async (req, res, next) => {
  try {
    const result = await seedService.clearAllData(req.user.username);
    res.status(200).json(result);
  } catch (err) { next(err); }
});

// POST /api/event/seed-round3/:roundId — Seed Round 3 poll questions + profile-guess onto an existing round
router.post('/seed-round3/:roundId', async (req, res, next) => {
  try {
    const result = await seedService.seedRound3Questions(req.params.roundId);
    res.status(200).json(result);
  } catch (err) { next(err); }
});

module.exports = router;
