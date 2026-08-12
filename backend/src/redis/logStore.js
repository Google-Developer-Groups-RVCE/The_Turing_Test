'use strict';

/**
 * logStore.js
 * Stores audit log entries in a Redis list.
 * Logs are kept in most-recent-first order (LPUSH + LTRIM).
 */

const { redisClient } = require('../config/redisClient');
const keys = require('./keys');

const logStore = {
  /**
   * Prepend a log entry. Trims list to last 2000 entries to prevent unbounded growth.
   * @param {{ admin, action, target, level, timestamp }} entry
   */
  async addLog(entry) {
    const detailsObj = entry.details || entry.target || '';
    const detailsStr = typeof detailsObj === 'string' ? detailsObj : JSON.stringify(detailsObj);
    const logObj = {
      admin: entry.admin || entry.adminUsername || 'system',
      action: entry.action || '',
      target: entry.target || detailsStr,
      details: detailsStr,
      level: entry.level || 'info',
      timestamp: entry.timestamp || Date.now(),
    };
    const logString = JSON.stringify(logObj);
    await redisClient.lpush(keys.LOGS, logString);
    await redisClient.ltrim(keys.LOGS, 0, 1999); // keep last 2000

    try {
      const io = require('../sockets/socketServer').getIO();
      if (io) io.emit('log:new', { logEntry: logObj });
    } catch (e) {}
  },

  /**
   * Get paginated logs (newest first).
   * @param {number} page   1-indexed
   * @param {number} limit  entries per page
   * @returns {{ logs: object[], total: number }}
   */
  async getLogs({ page = 1, limit = 50, search = '' } = {}) {
    const all = await redisClient.lrange(keys.LOGS, 0, -1);
    let parsed = all.map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);

    if (search) {
      const q = search.toLowerCase();
      parsed = parsed.filter(
        (l) =>
          (l.action || '').toLowerCase().includes(q) ||
          (l.admin || '').toLowerCase().includes(q) ||
          (l.target || '').toLowerCase().includes(q) ||
          (l.details || '').toLowerCase().includes(q)
      );
    }

    const total = parsed.length;
    const start = (page - 1) * limit;
    const logs = parsed.slice(start, start + limit);
    return { logs, total, page, limit };
  },
};

module.exports = logStore;
