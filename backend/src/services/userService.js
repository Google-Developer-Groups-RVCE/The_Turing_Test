'use strict';

/**
 * userService.js
 * All user management business logic. Uses userStore for Redis access.
 * Emits audit logs for every mutation.
 */

const userStore = require('../redis/userStore');
const { hashPassword } = require('../utils/hashPassword');
const logStore = require('../redis/logStore');

class UserService {
  /**
   * List all users with optional search, role/status filter, and pagination.
   */
  async getAllUsers({ page = 1, limit = 20, search = '', role = '', status = '' } = {}) {
    const allUsernames = await userStore.getAllUsernames();
    let users = await Promise.all(allUsernames.map((u) => userStore.getUser(u)));
    users = users.filter(Boolean);

    // Apply filters
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) => u.username.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q)
      );
    }
    if (role) users = users.filter((u) => u.role === role);
    if (status) users = users.filter((u) => (u.status || 'active') === status);

    // Strip password hashes
    users = users.map(({ passwordHash, ...safe }) => safe);

    // Paginate
    const total = users.length;
    const start = (page - 1) * limit;
    const paginated = users.slice(start, start + limit);

    return { users: paginated, total, page, limit };
  }

  /** Get a single user (without password hash). */
  async getUser(username) {
    const user = await userStore.getUser(username);
    if (!user) return null;
    const { passwordHash, ...safe } = user;
    return safe;
  }

  /**
   * Update a user's fields. If password is provided, it will be hashed.
   * Logs the action.
   */
  async updateUser(username, updates, adminUsername = 'system') {
    const user = await userStore.getUser(username);
    if (!user) throw new Error('User not found');

    const toUpdate = { ...updates };
    if (toUpdate.password) {
      toUpdate.passwordHash = await hashPassword(toUpdate.password);
      delete toUpdate.password;
    }
    // Don't allow accidental username change via this path; use a dedicated method if needed
    delete toUpdate.username;

    await userStore.updateUser(username, toUpdate);

    await logStore.addLog({
      admin: adminUsername,
      action: 'UPDATE_USER',
      target: username,
      level: 'info',
      timestamp: Date.now(),
    });
  }

  /** Delete a user from Redis and all associated sets. */
  async deleteUser(username, adminUsername = 'system') {
    const user = await userStore.getUser(username);
    if (!user) throw new Error('User not found');

    await userStore.deleteUser(username, user.role);

    await logStore.addLog({
      admin: adminUsername,
      action: 'DELETE_USER',
      target: username,
      level: 'warn',
      timestamp: Date.now(),
    });
  }

  /** Export all users as CSV string. */
  async exportCsv() {
    const allUsernames = await userStore.getAllUsernames();
    const users = (await Promise.all(allUsernames.map((u) => userStore.getUser(u)))).filter(Boolean);

    const header = 'username,name,role,status,createdAt,lastLogin';
    const rows = users.map(
      (u) =>
        `${u.username},${u.name || ''},${u.role},${u.status || 'active'},${u.createdAt || ''},${u.lastLogin || ''}`
    );
    return [header, ...rows].join('\n');
  }

  /** Bulk delete. */
  async bulkDelete(usernames, adminUsername = 'system') {
    const results = { success: 0, failed: 0 };
    for (const username of usernames) {
      try {
        const u = await userStore.getUser(username);
        if (u) {
          await userStore.deleteUser(username, u.role);
          results.success++;
        }
      } catch {
        results.failed++;
      }
    }
    await logStore.addLog({
      admin: adminUsername,
      action: 'BULK_DELETE_USERS',
      target: `${usernames.length} users`,
      level: 'warn',
      timestamp: Date.now(),
    });
    return results;
  }

  /** Bulk set status (block/unblock). */
  async bulkSetStatus(usernames, status, adminUsername = 'system') {
    const results = { success: 0, failed: 0 };
    for (const username of usernames) {
      try {
        await userStore.updateUser(username, { status });
        results.success++;
      } catch {
        results.failed++;
      }
    }
    await logStore.addLog({
      admin: adminUsername,
      action: status === 'blocked' ? 'BULK_BLOCK_USERS' : 'BULK_UNBLOCK_USERS',
      target: `${usernames.length} users`,
      level: 'info',
      timestamp: Date.now(),
    });
    return results;
  }

  /** Bulk reset passwords to a default (username = new password for simplicity). */
  async bulkResetPasswords(usernames, adminUsername = 'system') {
    const results = { success: 0, failed: 0, newPasswords: [] };
    for (const username of usernames) {
      try {
        const defaultPassword = username.toLowerCase().slice(-6); // last 6 chars of username
        const hashed = await hashPassword(defaultPassword);
        await userStore.updateUser(username, { passwordHash: hashed });
        results.newPasswords.push({ username, newPassword: defaultPassword });
        results.success++;
      } catch {
        results.failed++;
      }
    }
    await logStore.addLog({
      admin: adminUsername,
      action: 'BULK_RESET_PASSWORDS',
      target: `${usernames.length} users`,
      level: 'warn',
      timestamp: Date.now(),
    });
    return results;
  }
}

module.exports = new UserService();
