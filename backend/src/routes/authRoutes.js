const express = require('express');
const authController = require('../controllers/authController');
const { registerValidator, loginValidator } = require('../validators/authValidators');
const validateRequest = require('../middleware/validateRequest');
const authMiddleware = require('../middleware/authMiddleware');
const { authRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authRateLimiter, registerValidator, validateRequest, authController.register);
router.post('/login', authRateLimiter, loginValidator, validateRequest, authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
