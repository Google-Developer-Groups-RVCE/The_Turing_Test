'use strict';

const express = require('express');
const router = express.Router();
const r5Controller = require('../controllers/r5Controller');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Participant routes
router.post('/response', r5Controller.submitResponse);
router.get('/response/mine', r5Controller.getMyResponse);
router.get('/status', r5Controller.getSubmissionStatus);

router.get('/options', r5Controller.getOptions);
router.post('/vote', r5Controller.submitVote);
router.get('/vote/mine', r5Controller.getMyVote);
router.get('/voting-status', r5Controller.getVotingStatus);

router.get('/results', r5Controller.getResults);

// Admin routes
router.post('/open-voting', roleMiddleware('admin'), r5Controller.openVoting);
router.post('/show-results', roleMiddleware('admin'), r5Controller.showResults);
router.post('/reset', roleMiddleware('admin'), r5Controller.resetRound5);

module.exports = router;
