const express = require('express');
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware('admin'));

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

module.exports = router;
