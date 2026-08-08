'use strict';

/**
 * jwtUtils.js
 * Thin wrapper around jsonwebtoken so secret management is in one place.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');

const SECRET = env.JWT_SECRET;
const EXPIRES_IN = env.JWT_EXPIRES_IN || '6h';

/**
 * Sign a JWT with the given payload.
 * @param {{ username: string, role: string }} payload
 * @returns {string} signed JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
};

/**
 * Verify and decode a JWT.
 * @param {string} token
 * @returns {{ username: string, role: string, iat: number, exp: number }}
 * @throws if token is invalid or expired
 */
const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

module.exports = { generateToken, verifyToken };
