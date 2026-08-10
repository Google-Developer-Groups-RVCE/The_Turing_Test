'use strict';

/**
 * logController.js — HTTP handler for audit logs.
 */

const logStore = require('../redis/logStore');

class LogController {
  /** GET /api/logs?page=1&limit=50&search= */
  async getLogs(req, res, next) {
    try {
      const { page = 1, limit = 50, search = '' } = req.query;
      const result = await logStore.getLogs({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LogController();
