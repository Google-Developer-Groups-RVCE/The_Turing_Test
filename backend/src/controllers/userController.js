'use strict';

/**
 * userController.js
 * Handles all HTTP request/response translation for user management.
 * All business logic lives in userService / csvImportService.
 */

const userService = require('../services/userService');
const csvImportService = require('../services/csvImportService');

class UserController {
  /** GET /users — list all users with search, filter, pagination */
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '', role = '', status = '' } = req.query;
      const result = await userService.getAllUsers({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        role,
        status,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /** POST /users — create a new user */
  async createUser(req, res, next) {
    try {
      const user = await userService.createUser(req.body, req.user?.username || 'admin');
      res.status(201).json({ user, message: 'User created successfully' });
    } catch (err) {
      next(err);
    }
  }

  /** GET /users/:username */
  async getUser(req, res, next) {
    try {
      const user = await userService.getUser(req.params.username);
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  }

  /** PUT /users/:username */
  async updateUser(req, res, next) {
    try {
      await userService.updateUser(req.params.username, req.body, req.user.username);
      res.status(200).json({ message: 'User updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  /** DELETE /users/:username */
  async deleteUser(req, res, next) {
    try {
      await userService.deleteUser(req.params.username, req.user.username);
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  /** POST /users/upload-csv */
  async uploadCsv(req, res, next) {
    try {
      if (!req.file) return res.status(400).json({ message: 'No CSV file uploaded' });
      const report = await csvImportService.importUsers(req.file.path, req.user.username);
      res.status(200).json(report);
    } catch (err) {
      next(err);
    }
  }

  /** GET /users/export-csv */
  async exportCsv(req, res, next) {
    try {
      const csvData = await userService.exportCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
      res.status(200).send(csvData);
    } catch (err) {
      next(err);
    }
  }

  /** POST /users/bulk/delete */
  async bulkDelete(req, res, next) {
    try {
      const { usernames } = req.body;
      if (!Array.isArray(usernames) || usernames.length === 0) {
        return res.status(400).json({ message: 'usernames array is required' });
      }
      const result = await userService.bulkDelete(usernames, req.user.username);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /** POST /users/bulk/block */
  async bulkBlock(req, res, next) {
    try {
      const { usernames } = req.body;
      if (!Array.isArray(usernames) || usernames.length === 0) {
        return res.status(400).json({ message: 'usernames array is required' });
      }
      const result = await userService.bulkSetStatus(usernames, 'blocked', req.user.username);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /** POST /users/bulk/unblock */
  async bulkUnblock(req, res, next) {
    try {
      const { usernames } = req.body;
      if (!Array.isArray(usernames) || usernames.length === 0) {
        return res.status(400).json({ message: 'usernames array is required' });
      }
      const result = await userService.bulkSetStatus(usernames, 'active', req.user.username);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /** POST /users/bulk/reset-passwords */
  async bulkResetPasswords(req, res, next) {
    try {
      const { usernames, newPassword } = req.body;
      if (!Array.isArray(usernames) || usernames.length === 0) {
        return res.status(400).json({ message: 'usernames array is required' });
      }
      const result = await userService.bulkResetPasswords(usernames, newPassword, req.user.username);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();
