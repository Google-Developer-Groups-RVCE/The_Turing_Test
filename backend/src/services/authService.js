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
    let user = await userStore.getUser(username);
    if (!user && typeof username === 'string') {
      user = await userStore.getUser(username.toLowerCase()) || await userStore.getUser(username.toUpperCase());
    }
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    if (user.status === 'blocked') {
      throw new Error('Account is blocked');
    }

    const isValid = await comparePassword(password, user.passwordHash);
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
