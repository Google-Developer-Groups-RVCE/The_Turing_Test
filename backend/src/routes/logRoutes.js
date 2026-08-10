'use strict';

/**
 * logRoutes.js — Audit log read endpoints (Admin only).
 */

const express = require('express');
const logController = require('../controllers/logController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// GET /api/logs?page=1&limit=50&search=
router.get('/', logController.getLogs);

module.exports = router;
