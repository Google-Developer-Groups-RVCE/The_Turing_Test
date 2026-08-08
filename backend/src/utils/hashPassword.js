'use strict';

/**
 * hashPassword.js
 * Thin wrapper around bcrypt so the rest of the codebase
 * never imports bcrypt directly.
 */

const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

/**
 * Hash a plain-text password.
 * @param {string} password
 * @returns {Promise<string>} bcrypt hash
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plain-text password against a bcrypt hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = { hashPassword, comparePassword };
