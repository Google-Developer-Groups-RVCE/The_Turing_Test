const userStore = require('../redis/userStore');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const { generateToken } = require('../utils/jwtUtils');

class AuthService {
  async register(username, password, name = '') {
    const exists = await userStore.usernameExists(username);
    if (exists) {
      throw new Error('Username already taken');
    }
    
    const hashed = await hashPassword(password);
    const user = {
      username,
      passwordHash: hashed,
      role: 'participant',
      name: name || username,
      createdAt: Date.now().toString(),
      status: 'active'
    };
    
    await userStore.createUser(user);
    const token = generateToken({ username: user.username, role: user.role });
    return {
      token,
      role: user.role,
      user: {
        username: user.username,
        role: user.role,
        name: user.name,
        status: user.status
      }
    };
  }

  async login(username, password) {
    const normalizedUsername = (username || '').trim();
    let user = await userStore.getUser(normalizedUsername);
    if (!user && typeof normalizedUsername === 'string') {
      user = await userStore.getUser(normalizedUsername.toLowerCase()) || await userStore.getUser(normalizedUsername.toUpperCase());
    }
    
    // Auto-create or repair demo accounts (a, b, admin)
    const lower = normalizedUsername.toLowerCase();
    if (!user && (lower === 'a' || lower === 'b' || lower === 'admin')) {
      const role = lower === 'a' || lower === 'admin' ? 'admin' : 'participant';
      const hashed = await hashPassword(password);
      user = {
        username: normalizedUsername,
        passwordHash: hashed,
        role,
        name: lower === 'a' || lower === 'admin' ? 'Super Admin' : `Participant ${normalizedUsername}`,
        createdAt: Date.now().toString(),
        status: 'active'
      };
      await userStore.createUser(user);
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    if (user.status === 'blocked') {
      throw new Error('Account is blocked');
    }

    let isValid = await comparePassword(password, user.passwordHash);
    
    // Guaranteed bypass for demo accounts (a, b, admin)
    if (lower === 'a' || lower === 'b' || lower === 'admin') {
      isValid = true;
    }

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken({ username: user.username, role: user.role });
    return {
      token,
      role: user.role,
      user: {
        username: user.username,
        role: user.role,
        name: user.name,
        status: user.status
      }
    };
  }
}

module.exports = new AuthService();
