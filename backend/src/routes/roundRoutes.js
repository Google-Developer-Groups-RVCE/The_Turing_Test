'use strict';

/**
 * roundRoutes.js
 * All round and event management endpoints.
 */

const express = require('express');
const roundController = require('../controllers/roundController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(authMiddleware);

// Participant & admin: read access
router.get('/', roundController.getAllRounds);
router.get('/current', roundController.getCurrentRound);

// Admin only: all write operations
router.use(roleMiddleware('admin'));
router.post('/', roundController.createRound);
router.put('/:roundId', roundController.updateRound);
router.delete('/:roundId', roundController.deleteRound);
router.post('/:roundId/start', roundController.startRound);
router.post('/:roundId/pause', roundController.pauseRound);
router.post('/:roundId/resume', roundController.resumeRound);
router.post('/:roundId/restart', roundController.restartRound);
router.post('/:roundId/end', roundController.endRound);

module.exports = router;
