'use strict';

const path = require('path');
// Adjust path to root directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { redisClient } = require('../backend/src/config/redisClient');
const seedService = require('../backend/src/services/seedService');

async function main() {
  console.log('Connecting to Redis...');
  try {
    // Await a ping to ensure connection is ready
    await redisClient.ping();
    console.log('Connected to Redis successfully.');

    console.log('Seeding Round 1, 2, and 3 questions...');
    const result = await seedService.seedSamples('cli-admin');
    console.log('Success:', result.message);
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    process.exit(0);
  }
}

main();
