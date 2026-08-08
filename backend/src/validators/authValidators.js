const { body } = require('express-validator');

const registerValidator = [
  body('username')
    .trim()
    .isAlphanumeric()
    .withMessage('Username must be alphanumeric'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
];

const loginValidator = [
  body('username').notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required')
];

module.exports = {
  registerValidator,
  loginValidator
};
