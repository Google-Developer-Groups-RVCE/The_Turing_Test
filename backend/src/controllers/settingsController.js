'use strict';

/**
 * settingsController.js — HTTP handler for event settings.
 */

const settingsService = require('../services/settingsService');

class SettingsController {
  /** GET /api/settings */
  async getSettings(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      res.status(200).json({ settings });
    } catch (err) {
      next(err);
    }
  }

  /** PUT /api/settings */
  async updateSettings(req, res, next) {
    try {
      const settings = await settingsService.updateSettings(req.body, req.user.username);
      res.status(200).json({ message: 'Settings updated', settings });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SettingsController();
