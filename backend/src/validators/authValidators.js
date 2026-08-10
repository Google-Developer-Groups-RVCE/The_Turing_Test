const { body } = require('express-validator');

const registerValidator = [
  body('username')
    .trim()
    .matches(/^[a-zA-Z0-9_,.\s-]+$/)
    .withMessage('Username must be alphanumeric or contain basic punctuation'),
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
