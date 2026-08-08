'use strict';

require('dotenv').config();
const { hashPassword } = require('../src/utils/hashPassword');
const userStore = require('../src/redis/userStore');
const { disconnectRedis } = require('../src/config/redisClient');
const logger = require('../src/utils/logger');

async function seed() {
  try {
    const adminUsername = 'A';
    const adminPassword = 'a';

    const exists = await userStore.usernameExists(adminUsername);
    if (!exists) {
      const hashed = await hashPassword(adminPassword);
      await userStore.createUser({
        username: adminUsername,
        passwordHash: hashed,
        role: 'admin',
        name: 'Super Admin',
        createdAt: Date.now().toString(),
        status: 'active'
      });
      logger.info('Admin user A seeded successfully. Username: A | Password: a');
    } else {
      logger.info('Admin user A already exists.');
    }

    const participantUsername = 'B';
    const participantPassword = 'b';
    const pExists = await userStore.usernameExists(participantUsername);
    if (!pExists) {
      const pHashed = await hashPassword(participantPassword);
      await userStore.createUser({
        username: participantUsername,
        passwordHash: pHashed,
        role: 'participant',
        name: 'Test Participant B',
        createdAt: Date.now().toString(),
        status: 'active'
      });
      logger.info('Participant user B seeded successfully. Username: B | Password: b');
    } else {
      logger.info('Participant user B already exists.');
    }
  } catch (err) {
    logger.error(`Error seeding admin user: ${err.message}`);
  } finally {
    await disconnectRedis();
    process.exit(0);
  }
}

seed();
