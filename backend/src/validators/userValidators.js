const { body } = require('express-validator');

const updateUserValidator = [
  body('name').optional().isString(),
  body('role').optional().isIn(['admin', 'participant']),
  body('password').optional().isLength({ min: 1 }),
  body('status').optional().isIn(['active', 'blocked'])
];

module.exports = {
  updateUserValidator
};
