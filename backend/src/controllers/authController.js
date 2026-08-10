const authService = require('../services/authService');
const userStore = require('../redis/userStore');

class AuthController {
  async register(req, res, next) {
    try {
      const { username, password, name } = req.body;
      const result = await authService.register(username, password, name);
      res.status(201).json(result);
    } catch (err) {
      if (err.message === 'Username already taken') {
        return res.status(409).json({ message: err.message });
      }
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      
      const logStore = require('../redis/logStore');
      await logStore.addLog({
        timestamp: Date.now(),
        level: 'info',
        action: 'USER_LOGIN',
        adminUsername: username,
        details: `User logged in: ${username}`
      });
      const io = require('../sockets/socketServer').getIO();
      if (io) io.emit('log:new', { logEntry: { action: 'USER_LOGIN', admin: username, timestamp: Date.now() } });
      
      res.status(200).json(result);
    } catch (err) {
      if (err.message === 'Invalid credentials' || err.message === 'Account is blocked') {
        return res.status(401).json({ message: err.message });
      }
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const username = req.user?.username || 'Unknown';
      const logStore = require('../redis/logStore');
      await logStore.addLog({
        timestamp: Date.now(),
        level: 'info',
        action: 'USER_LOGOUT',
        adminUsername: username,
        details: `User logged out: ${username}`
      });
      const io = require('../sockets/socketServer').getIO();
      if (io) io.emit('log:new', { logEntry: { action: 'USER_LOGOUT', admin: username, timestamp: Date.now() } });
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const username = req.user.username;
      let user = await userStore.getUser(username);
      if (!user) {
        user = await userStore.getUser(username.toLowerCase()) || await userStore.getUser(username.toUpperCase());
      }
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const { passwordHash, ...safeUser } = user;
      res.status(200).json({ user: safeUser, ...safeUser });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
