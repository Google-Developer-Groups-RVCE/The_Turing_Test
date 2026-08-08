'use strict';

const { redisClient } = require('../config/redisClient');
const keys = require('./keys');

const DEFAULTS = {
  autoAdvance: 'false',
  roundDurationSeconds: '300',
  allowLateSubmission: 'false',
  eventName: 'The Turing Test',
  maxParticipants: '500',
};

const settingsStore = {
  async updateSettings(settings) {
    const entries = Object.entries(settings).map(([k, v]) => [k, String(v ?? '')]).flat();
    if (entries.length > 0) {
      await redisClient.hmset(keys.SETTINGS, ...entries);
    }
  },

  async getSettings() {
    const settings = await redisClient.hgetall(keys.SETTINGS);
    return settings && Object.keys(settings).length ? { ...DEFAULTS, ...settings } : { ...DEFAULTS };
  },
};

module.exports = settingsStore;
