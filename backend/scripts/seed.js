'use strict';

require('dotenv').config();
const { hashPassword } = require('../src/utils/hashPassword');
const userStore = require('../src/redis/userStore');
const { disconnectRedis } = require('../src/config/redisClient');
const logger = require('../src/utils/logger');

async function seed() {
  try {
    const adminUsernames = ['a', 'A', 'aa'];
    for (const u of adminUsernames) {
      const exists = await userStore.usernameExists(u);
      if (!exists) {
        const hashed = await hashPassword(u.toLowerCase());
        await userStore.createUser({
          username: u,
          passwordHash: hashed,
          role: 'admin',
          name: `Admin ${u}`,
          createdAt: Date.now().toString(),
          status: 'active'
        });
        logger.info(`Admin user '${u}' seeded successfully. Username: ${u} | Password: ${u.toLowerCase()}`);
      } else {
        logger.info(`Admin user '${u}' already exists.`);
      }
    }

    const participantUsernames = ['b', 'B', 'bb'];
    for (const u of participantUsernames) {
      const pExists = await userStore.usernameExists(u);
      if (!pExists) {
        const pHashed = await hashPassword(u.toLowerCase());
        await userStore.createUser({
          username: u,
          passwordHash: pHashed,
          role: 'participant',
          name: `Participant ${u}`,
          createdAt: Date.now().toString(),
          status: 'active'
        });
        logger.info(`Participant user '${u}' seeded successfully. Username: ${u} | Password: ${u.toLowerCase()}`);
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
