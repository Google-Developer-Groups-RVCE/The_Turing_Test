const express = require('express');
const responseController = require('../controllers/responseController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Participant routes
router.post('/:roundId', responseController.submitResponse);
router.get('/:roundId/mine', responseController.getMyResponse);

// The admin dashboard includes a built-in participant-device preview.  Keep
// its answer separate from the administrator who is controlling the event.
router.post('/:roundId/simulated', roleMiddleware('admin'), responseController.submitSimulatedResponse);
router.get('/:roundId/simulated', roleMiddleware('admin'), responseController.getSimulatedResponse);

// Admin routes
router.get('/:roundId', roleMiddleware('admin'), responseController.getResponses);
router.delete('/:roundId', roleMiddleware('admin'), responseController.deleteResponses);

module.exports = router;
