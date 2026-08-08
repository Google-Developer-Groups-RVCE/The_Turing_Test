'use strict';

require('dotenv').config();
const { hashPassword } = require('../src/utils/hashPassword');
const userStore = require('../src/redis/userStore');
const { disconnectRedis } = require('../src/config/redisClient');
const logger = require('../src/utils/logger');

async function seed() {
  try {
    const adminUsernames = ['a', 'A'];
    for (const u of adminUsernames) {
      const exists = await userStore.usernameExists(u);
      if (!exists) {
        const hashed = await hashPassword('a');
        await userStore.createUser({
          username: u,
          passwordHash: hashed,
          role: 'admin',
          name: 'Super Admin',
          createdAt: Date.now().toString(),
          status: 'active'
        });
        logger.info(`Admin user '${u}' seeded successfully. Username: ${u} | Password: a`);
      } else {
        logger.info(`Admin user '${u}' already exists.`);
      }
    }

    const participantUsernames = ['b', 'B'];
    for (const u of participantUsernames) {
      const pExists = await userStore.usernameExists(u);
      if (!pExists) {
        const pHashed = await hashPassword('b');
        await userStore.createUser({
          username: u,
          passwordHash: pHashed,
          role: 'participant',
          name: 'Test Participant B',
          createdAt: Date.now().toString(),
          status: 'active'
        });
        logger.info(`Participant user '${u}' seeded successfully. Username: ${u} | Password: b`);
      } else {
        logger.info(`Participant user '${u}' already exists.`);
      }
    }
  } catch (err) {
    logger.error(`Error seeding admin/user: ${err.message}`);
  } finally {
    await disconnectRedis();
    process.exit(0);
  }
}

seed();
