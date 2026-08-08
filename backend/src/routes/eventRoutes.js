'use strict';

/**
 * eventRoutes.js — Global event controls (reset, end, get state).
 * Admin-only operations that affect the entire event.
 */

const express = require('express');
const roundController = require('../controllers/roundController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// POST /api/event/reset — Reset all rounds to pending state
router.post('/reset', roundController.resetEvent);

// POST /api/event/end — End the entire event
router.post('/end', roundController.endEvent);

module.exports = router;
