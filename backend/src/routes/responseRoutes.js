const express = require('express');
const responseController = require('../controllers/responseController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Participant routes
router.post('/:roundId', responseController.submitResponse);
router.get('/:roundId/mine', responseController.getMyResponse);

// Admin routes
router.get('/:roundId', roleMiddleware('admin'), responseController.getResponses);
router.delete('/:roundId', roleMiddleware('admin'), responseController.deleteResponses);

module.exports = router;
