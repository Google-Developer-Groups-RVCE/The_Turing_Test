/**
 * seed-redis.js
 * ------------------------------------------------------------------
 * Standalone Redis Seeding Script for GDG Turing Test
 * 
 * Usage:
 *   node scripts/seed-redis.js
 *   REDIS_HOST=redis-service REDIS_PASSWORD=production-redis-password node scripts/seed-redis.js
 * ------------------------------------------------------------------
 */

'use strict';

let Redis, bcrypt;
try {
  Redis = require('ioredis');
} catch {
  try {
    Redis = require('../backend/node_modules/ioredis');
  } catch {
    try {
      Redis = require('/app/node_modules/ioredis');
    } catch {
      console.error('❌ Could not locate ioredis module. Ensure ioredis is installed.');
      process.exit(1);
    }
  }
}

try {
  bcrypt = require('bcryptjs');
} catch {
  try {
    bcrypt = require('../backend/node_modules/bcryptjs');
  } catch {
    try {
      bcrypt = require('/app/node_modules/bcryptjs');
    } catch {
      bcrypt = null;
    }
  }
}

// Environment settings with smart fallbacks
const host = process.env.REDIS_HOST || 'redis-service';
const port = parseInt(process.env.REDIS_PORT) || 6379;
const password = process.env.REDIS_PASSWORD || 'production-redis-password';
const db = parseInt(process.env.REDIS_DB) || 0;

console.log('🌱 GDG Turing Test — Redis Seeder Script');
console.log(`Connecting to Redis at ${host}:${port} (DB ${db})...`);

const redis = new Redis({
  host,
  port,
  password,
  db,
  retryStrategy: (attempt) => {
    if (attempt > 3) return null;
    return 500;
  },
});

async function runSeed() {
  try {
    await redis.ping();
    console.log(`[✓] Connected to Redis successfully.\n`);

    // 1. Seed Accounts (Admin & Default User)
    console.log('📦 Seeding default user accounts...');
    const adminPasswordHash = bcrypt ? await bcrypt.hash('a', 10) : '$2a$10$e.wPZ99Y7w9pU6XJk0oJEOw5d/z4KxK1Jk8p4k1m8n9o0p1q2r3s4';
    const userPasswordHash = bcrypt ? await bcrypt.hash('b', 10) : '$2a$10$e.wPZ99Y7w9pU6XJk0oJEOw5d/z4KxK1Jk8p4k1m8n9o0p1q2r3s4';

    const adminUser = {
      username: 'A',
      name: 'Super Admin',
      role: 'admin',
      status: 'active',
      passwordHash: adminPasswordHash,
      createdAt: Date.now().toString(),
    };

    const testUser = {
      username: 'B',
      name: 'Participant B',
      role: 'participant',
      status: 'active',
      passwordHash: userPasswordHash,
      createdAt: Date.now().toString(),
    };

    // User Keys: user:<username>, set: usernames, set: admins
    await redis.hset(`user:${adminUser.username}`, adminUser);
    await redis.sadd('usernames', adminUser.username);
    await redis.sadd('admins', adminUser.username);

    await redis.hset(`user:${testUser.username}`, testUser);
    await redis.sadd('usernames', testUser.username);

    console.log(`    ✓ Admin Account: username="A", password="a"`);
    console.log(`    ✓ Test Participant: username="B", password="b"`);

    // 2. Seed Rounds
    console.log('\n🎯 Seeding Rounds...');
    const rounds = [
      { id: 'round_1_aptitude', name: 'Round 1 — Live Conversations', status: 'pending', durationSeconds: '300', order: '1' },
      { id: 'round_2_coding', name: 'Round 2 — Image Challenge', status: 'pending', durationSeconds: '300', order: '2' },
      { id: 'round_3_decode', name: 'Round 3 — Turing Test Speedrun', status: 'pending', durationSeconds: '300', order: '3' },
    ];

    await redis.del('rounds:order');
    for (const r of rounds) {
      await redis.hset(`round:${r.id}`, r);
      await redis.rpush('rounds:order', r.id);
      console.log(`    ✓ Round registered: [${r.id}] ${r.name}`);
    }

    // Set Initial Event State
    await redis.hset('eventState', { currentRoundId: 'round_1_aptitude', status: 'pending' });

    // 3. Round 1 Questions (MCQ)
    console.log('\n❓ Seeding Round 1 Questions...');
    const r1Questions = [
      { id: 'q1_1', text: 'If 5 machines take 5 minutes to make 5 widgets, how long would 100 machines take to make 100 widgets?', type: 'mcq', options: JSON.stringify(['5 minutes', '100 minutes', '50 minutes', '1 minute']), correctAnswer: '5 minutes', points: '10', order: '1', durationSeconds: '60', showEvaluation: 'true' },
      { id: 'q1_2', text: 'Which number logically completes the sequence: 2, 6, 12, 20, 30, __?', type: 'mcq', options: JSON.stringify(['42', '40', '36', '48']), correctAnswer: '42', points: '10', order: '2', durationSeconds: '60', showEvaluation: 'true' },
      { id: 'q1_3', text: 'Look at this series: 7, 10, 8, 11, 9, 12, __. What number should come next?', type: 'mcq', options: JSON.stringify(['10', '13', '7', '14']), correctAnswer: '10', points: '10', order: '3', durationSeconds: '60', showEvaluation: 'true' },
    ];

    await redis.del('questions:round_1_aptitude');
    for (const q of r1Questions) {
      await redis.hset(`question:round_1_aptitude:${q.id}`, q);
      await redis.rpush('questions:round_1_aptitude', q.id);
    }
    await redis.set('round:round_1_aptitude:active_question', 'q1_1');
    console.log(`    ✓ Seeded 3 Aptitude MCQs (active question: q1_1)`);

    // 4. Round 2 Questions (Coding & Image Challenges)
    console.log('\n🖼️ Seeding Round 2 Questions (with image URLs)...');
    const r2Questions = [
      { id: 'q2_1', text: 'Round 2 — Server Room: Which image is AI-generated?', type: 'mcq', options: JSON.stringify(['Image 1 (AI)', 'Image 2 (Real)']), correctAnswer: 'Image 1 (AI)', points: '10', order: '1', durationSeconds: '60', imageUrl: '/reference/r2/image1.webp', showEvaluation: 'true' },
      { id: 'q2_2', text: 'Round 2 — Wildlife Photography: Which part of the image was AI-edited?', type: 'mcq', options: JSON.stringify(['The head / face', 'The stripes on the abdomen', 'The legs', 'The background']), correctAnswer: 'The background', points: '10', order: '2', durationSeconds: '60', imageUrl: '/reference/r2/image3.webp', showEvaluation: 'true' },
      { id: 'q2_3', text: 'Round 2 — Street Photography: Write a prompt that recreates this image as closely as possible.', type: 'text', options: JSON.stringify([]), correctAnswer: '', points: '10', order: '3', durationSeconds: '60', imageUrl: '/reference/r2/image4.webp', showEvaluation: 'true' },
      { id: 'q2_4', text: 'Round 2 — Bird Photography: Is this image real or AI-generated?', type: 'mcq', options: JSON.stringify(['Real', 'AI-generated']), correctAnswer: 'AI-generated', points: '10', order: '4', durationSeconds: '60', imageUrl: '/reference/r2/image5.webp', showEvaluation: 'true' },
    ];

    await redis.del('questions:round_2_coding');
    for (const q of r2Questions) {
      await redis.hset(`question:round_2_coding:${q.id}`, q);
      await redis.rpush('questions:round_2_coding', q.id);
    }
    await redis.set('round:round_2_coding:active_question', 'q2_1');
    console.log(`    ✓ Seeded 4 Image & Coding Challenges (active question: q2_1)`);

    // 5. Round 3 Questions (5 Polls + 1 Profile Guess)
    console.log('\n🕵️ Seeding Round 3 Questions (5 Polls + Profile Guess)...');
    const r3Questions = [
      {
        id: 'poll1', order: '1', type: 'poll',
        text: 'Poll 1 – Daily Life: Vote for the question you want Gemini to answer',
        options: JSON.stringify([
          { key: 'A', question: "What does a perfect Sunday look like for you?", answer: "A slow morning, a good lunch, maybe getting a few things done, and a quiet evening." },
          { key: 'B', question: "What's something your friends often tease you about?", answer: "Probably how quickly I start thinking about going home during gatherings." },
          { key: 'C', question: "What's one thing you almost never leave home without?", answer: "My wallet. Leaving without a wallet still makes me feel like I've forgotten something." }
        ]),
        correctAnswer: '', points: '0', showEvaluation: 'false', durationSeconds: '120'
      },
      {
        id: 'poll2', order: '2', type: 'poll',
        text: 'Poll 2 – Memories & Experiences: Vote for the question you want Gemini to answer',
        options: JSON.stringify([
          { key: 'A', question: "What's something younger people do that you find interesting?", answer: "How naturally they document ordinary things." },
          { key: 'B', question: "What's a change in everyday life that still amazes you?", answer: "How many separate things have quietly disappeared into one device." },
          { key: 'C', question: "How did you usually discover new music growing up?", answer: "Mostly through friends or hearing something somewhere repeatedly." }
        ]),
        correctAnswer: '', points: '0', showEvaluation: 'false', durationSeconds: '120'
      },
      {
        id: 'poll3', order: '3', type: 'poll',
        text: 'Poll 3 – Work & Thinking: Vote for the question you want Gemini to answer',
        options: JSON.stringify([
          { key: 'A', question: "What's the most tiring part of your work?", answer: "Probably revisiting the same information repeatedly." },
          { key: 'B', question: "What skill do you think you're unusually good at?", answer: "Remembering small differences in how people explain things." },
          { key: 'C', question: "What's something you do before an important meeting?", answer: "I usually go through everything beforehand and make a rough mental list." }
        ]),
        correctAnswer: '', points: '0', showEvaluation: 'false', durationSeconds: '120'
      },
      {
        id: 'poll4', order: '4', type: 'poll',
        text: 'Poll 4 – Behaviour & Perspective: Vote for the question you want Gemini to answer',
        options: JSON.stringify([
          { key: 'A', question: "What's something you find interesting about conversations?", answer: "How differently two people can remember the same situation." },
          { key: 'B', question: "What's something you've become less impressed by over time?", answer: "Confidence. Someone sounding completely certain doesn't really tell me whether they're right." },
          { key: 'C', question: "What do your friends sometimes find annoying about you?", answer: "I ask too many follow-up questions." }
        ]),
        correctAnswer: '', points: '0', showEvaluation: 'false', durationSeconds: '120'
      },
      {
        id: 'poll5', order: '5', type: 'poll',
        text: 'Poll 5 – Personal Interests: Vote for the question you want Gemini to answer',
        options: JSON.stringify([
          { key: 'A', question: "What kind of moments do you remember most clearly?", answer: "Usually very brief ones. A particular expression or something unusual." },
          { key: 'B', question: "What's something you're unusually patient about?", answer: "Waiting when I feel the timing matters." },
          { key: 'C', question: "When you visit somewhere new, what do you usually do first?", answer: "Usually walk around without deciding too much beforehand." }
        ]),
        correctAnswer: '', points: '0', showEvaluation: 'false', durationSeconds: '120'
      },
      {
        id: 'poll6', order: '6', type: 'profile-guess',
        text: 'Final Submission – Decode the Hidden Profile',
        options: JSON.stringify([]),
        correctAnswer: 'Age: 47 | Profession: Lawyer | Hobby: Photography',
        points: '30', showEvaluation: 'true', durationSeconds: '240',
        targetAge: '47', targetProfession: 'Lawyer', targetHobby: 'Photography'
      }
    ];

    await redis.del('questions:round_3_decode');
    for (const q of r3Questions) {
      await redis.hset(`question:round_3_decode:${q.id}`, q);
      await redis.rpush('questions:round_3_decode', q.id);
    }
    await redis.set('round:round_3_decode:active_question', 'poll1');
    console.log(`    ✓ Seeded 5 Poll Questions + 1 Profile Guess (active question: poll1)`);

    console.log('\n-----------------------------------------');
    console.log('✅ Redis Seeding Completed Successfully!');
    console.log('-----------------------------------------\n');
  } catch (err) {
    console.error('❌ Error during Redis seeding:', err);
    process.exitCode = 1;
  } finally {
    redis.disconnect();
  }
}

runSeed();
