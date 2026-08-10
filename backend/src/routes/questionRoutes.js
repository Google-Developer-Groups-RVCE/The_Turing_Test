const express = require('express');
const questionController = require('../controllers/questionController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Participant routes
router.get('/:roundId/active', questionController.getActiveQuestion);

// Admin routes
router.use(roleMiddleware('admin'));
router.get('/:roundId', questionController.getQuestions);
router.post('/:roundId', questionController.addQuestion);
router.put('/:roundId/:questionId', questionController.updateQuestion);
router.delete('/:roundId/:questionId', questionController.deleteQuestion);
router.post('/:roundId/next', questionController.nextQuestion);
router.post('/:roundId/previous', questionController.previousQuestion);
router.post('/:roundId/activate/:questionId', questionController.setActiveQuestion);
router.post('/:roundId/reveal-poll', questionController.revealPoll);
router.post('/:roundId/override-option', questionController.overrideDisplayedOption);

module.exports = router;
