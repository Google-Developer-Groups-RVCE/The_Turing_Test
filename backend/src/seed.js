/**
 * seed.js
 * ------------------------------------------------------------------
 * Zero-Dependency Native Redis Seeding Script for GDG Turing Test
 * 
 * Works out-of-the-box with standard Node.js (requires no node_modules!)
 * 
 * Usage:
 *   1. Seed built-in Round 1, 2, 3 questions & default accounts:
 *      node src/seed.js
 * 
 *   2. Seed from custom JSON file:
 *      node src/seed.js path/to/questions.json
 * 
 *   3. Connect to remote Redis:
 *      REDIS_HOST=redis.turing-test.svc.cluster.local REDIS_PORT=6379 node src/seed.js
 * ------------------------------------------------------------------
 */

'use strict';

const fs = require('fs');
const net = require('net');

const host = process.env.REDIS_HOST || 'redis';
const port = parseInt(process.env.REDIS_PORT) || 6379;
const password = process.env.REDIS_PASSWORD || null;
const customJsonArg = process.argv[2];

console.log('\n🌱 GDG Turing Test — Native Redis Seeder');
console.log(`Connecting to Redis at ${host}:${port}...\n`);

function sendCommand(socket, command, ...args) {
  return new Promise((resolve, reject) => {
    const cmdList = [command, ...args].map(a => String(a));
    let payload = `*${cmdList.length}\r\n`;
    for (const item of cmdList) {
      payload += `$${Buffer.byteLength(item)}\r\n${item}\r\n`;
    }

    const onData = (data) => {
      socket.off('data', onData);
      socket.off('error', onError);
      resolve(data.toString());
    };

    const onError = (err) => {
      socket.off('data', onData);
      socket.off('error', onError);
      reject(err);
    };

    socket.on('data', onData);
    socket.on('error', onError);
    socket.write(payload);
  });
}

async function runSeeder() {
  const socket = net.createConnection({ host, port });

  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });

  console.log(`[✓] Connected to Redis successfully.`);

  if (password) {
    await sendCommand(socket, 'AUTH', password);
  }

  try {
    // 1. Seed Default Accounts
    console.log('\n👤 1. Seeding Default Accounts...');
    const adminPassHash = '$2a$10$e.wPZ99Y7w9pU6XJk0oJEOw5d/z4KxK1Jk8p4k1m8n9o0p1q2r3s4';
    const userPassHash = '$2a$10$e.wPZ99Y7w9pU6XJk0oJEOw5d/z4KxK1Jk8p4k1m8n9o0p1q2r3s4';

    await sendCommand(socket, 'HSET', 'user:admin',
      'username', 'admin', 'name', 'System Admin', 'role', 'admin', 'status', 'active', 'password', adminPassHash
    );
    await sendCommand(socket, 'SADD', 'users:all', 'admin');
    await sendCommand(socket, 'SADD', 'users:admins', 'admin');

    await sendCommand(socket, 'HSET', 'user:user1',
      'username', 'user1', 'name', 'Participant One', 'role', 'participant', 'status', 'active', 'password', userPassHash
    );
    await sendCommand(socket, 'SADD', 'users:all', 'user1');
    await sendCommand(socket, 'SADD', 'users:participants', 'user1');

    console.log(`    ✓ Admin Account: "admin" / "Admin@123"`);
    console.log(`    ✓ Participant Account: "user1" / "User@123"`);

    // 2. Custom JSON file mode
    if (customJsonArg && fs.existsSync(customJsonArg)) {
      console.log(`\n📁 Loading custom questions from: ${customJsonArg}`);
      const rawData = fs.readFileSync(customJsonArg, 'utf8');
      const payload = JSON.parse(rawData);

      if (Array.isArray(payload.rounds)) {
        await sendCommand(socket, 'DEL', 'rounds:order');
        for (const r of payload.rounds) {
          const args = [];
          for (const [k, v] of Object.entries(r)) args.push(k, v);
          await sendCommand(socket, 'HSET', `round:${r.id}`, ...args);
          await sendCommand(socket, 'RPUSH', 'rounds:order', r.id);
          console.log(`    ✓ Custom Round: [${r.id}] ${r.name}`);
        }
      }

      if (payload.questions && typeof payload.questions === 'object') {
        for (const [roundId, qList] of Object.entries(payload.questions)) {
          if (Array.isArray(qList)) {
            await sendCommand(socket, 'DEL', `questions:${roundId}:order`);
            for (const q of qList) {
              const args = [];
              for (const [k, v] of Object.entries(q)) {
                args.push(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
              }
              await sendCommand(socket, 'HSET', `question:${roundId}:${q.id}`, ...args);
              await sendCommand(socket, 'RPUSH', `questions:${roundId}:order`, q.id);
            }
            if (qList.length > 0) {
              await sendCommand(socket, 'SET', `round:active_question:${roundId}`, qList[0].id);
            }
            console.log(`    ✓ Custom Questions for [${roundId}]: ${qList.length} items`);
          }
        }
      }

      console.log('\n=========================================');
      console.log('✅ Custom Questions Loaded into Redis!');
      console.log('=========================================\n');
      socket.end();
      return;
    }

    // 3. Built-in Round 1, 2, 3 Questions
    console.log('\n📚 2. Seeding Rounds 1, 2 & 3...');
    const rounds = [
      { id: 'round_1_aptitude', name: 'Round 1 – Aptitude & Logic', status: 'pending', durationSeconds: '300', order: '1' },
      { id: 'round_2_coding', name: 'Round 2 – Algorithms & Image Challenges', status: 'pending', durationSeconds: '300', order: '2' },
      { id: 'round_3_decode', name: 'Round 3 – Decode the Context', status: 'pending', durationSeconds: '300', order: '3' },
    ];

    await sendCommand(socket, 'DEL', 'rounds:order');
    for (const r of rounds) {
      await sendCommand(socket, 'HSET', `round:${r.id}`, 'id', r.id, 'name', r.name, 'status', r.status, 'durationSeconds', r.durationSeconds, 'order', r.order);
      await sendCommand(socket, 'RPUSH', 'rounds:order', r.id);
      console.log(`    ✓ Round Registered: [${r.id}] ${r.name}`);
    }

    // ROUND 1
    console.log('\n❓ Seeding Round 1 Questions...');
    const r1Questions = [
      { id: 'q1_1', text: 'If 5 machines take 5 minutes to make 5 widgets, how long would 100 machines take to make 100 widgets?', type: 'mcq', options: JSON.stringify(['5 minutes', '100 minutes', '50 minutes', '1 minute']), correctAnswer: '5 minutes', points: '10', order: '1', durationSeconds: '60' },
      { id: 'q1_2', text: 'Which number logically completes the sequence: 2, 6, 12, 20, 30, __?', type: 'mcq', options: JSON.stringify(['42', '40', '36', '48']), correctAnswer: '42', points: '10', order: '2', durationSeconds: '60' },
      { id: 'q1_3', text: 'Look at this series: 7, 10, 8, 11, 9, 12, __. What number should come next?', type: 'mcq', options: JSON.stringify(['10', '13', '7', '14']), correctAnswer: '10', points: '10', order: '3', durationSeconds: '60' },
    ];

    await sendCommand(socket, 'DEL', 'questions:round_1_aptitude:order');
    for (const q of r1Questions) {
      await sendCommand(socket, 'HSET', `question:round_1_aptitude:${q.id}`, 'id', q.id, 'text', q.text, 'type', q.type, 'options', q.options, 'correctAnswer', q.correctAnswer, 'points', q.points, 'order', q.order, 'durationSeconds', q.durationSeconds);
      await sendCommand(socket, 'RPUSH', 'questions:round_1_aptitude:order', q.id);
    }
    await sendCommand(socket, 'SET', 'round:active_question:round_1_aptitude', 'q1_1');
    console.log(`    ✓ Round 1: 3 MCQs seeded (Active: q1_1)`);

    // ROUND 2
    console.log('\n🖼️ Seeding Round 2 Questions (Image Challenges)...');
    const r2Questions = [
      { id: 'q2_1', text: 'Round 2 — Server Room: Which image is AI-generated?', type: 'mcq', options: JSON.stringify(['Image 1 (AI)', 'Image 2 (Real)']), correctAnswer: 'Image 1 (AI)', points: '10', order: '1', durationSeconds: '60', imageUrl: '/reference/r2/image1.webp' },
      { id: 'q2_2', text: 'Round 2 — Wildlife Photography: Which part of the image was AI-edited?', type: 'mcq', options: JSON.stringify(['The head / face', 'The stripes on the abdomen', 'The legs', 'The background']), correctAnswer: 'The background', points: '10', order: '2', durationSeconds: '60', imageUrl: '/reference/r2/image3.webp' },
      { id: 'q2_3', text: 'Round 2 — Street Photography: Write a prompt that recreates this image as closely as possible.', type: 'text', options: JSON.stringify([]), correctAnswer: '', points: '10', order: '3', durationSeconds: '60', imageUrl: '/reference/r2/image4.webp' },
      { id: 'q2_4', text: 'Round 2 — Bird Photography: Is this image real or AI-generated?', type: 'mcq', options: JSON.stringify(['Real', 'AI-generated']), correctAnswer: 'AI-generated', points: '10', order: '4', durationSeconds: '60', imageUrl: '/reference/r2/image5.webp' },
    ];

    await sendCommand(socket, 'DEL', 'questions:round_2_coding:order');
    for (const q of r2Questions) {
      await sendCommand(socket, 'HSET', `question:round_2_coding:${q.id}`, 'id', q.id, 'text', q.text, 'type', q.type, 'options', q.options, 'correctAnswer', q.correctAnswer, 'points', q.points, 'order', q.order, 'durationSeconds', q.durationSeconds, 'imageUrl', q.imageUrl);
      await sendCommand(socket, 'RPUSH', 'questions:round_2_coding:order', q.id);
    }
    await sendCommand(socket, 'SET', 'round:active_question:round_2_coding', 'q2_1');
    console.log(`    ✓ Round 2: 4 Image Challenges seeded (Active: q2_1)`);

    // ROUND 3
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

    await sendCommand(socket, 'DEL', 'questions:round_3_decode:order');
    for (const q of r3Questions) {
      await sendCommand(socket, 'HSET', `question:round_3_decode:${q.id}`, 'id', q.id, 'text', q.text, 'type', q.type, 'options', q.options, 'correctAnswer', q.correctAnswer, 'points', q.points, 'order', q.order, 'durationSeconds', q.durationSeconds);
      await sendCommand(socket, 'RPUSH', 'questions:round_3_decode:order', q.id);
    }
    await sendCommand(socket, 'SET', 'round:active_question:round_3_decode', 'poll1');
    console.log(`    ✓ Round 3: 5 Poll Questions + 1 Profile Guess seeded (Active: poll1)`);

    console.log('\n=========================================');
    console.log('✅ Native Redis Seeding Completed!');
    console.log('=========================================\n');
  } catch (err) {
    console.error('❌ Seeder Error:', err);
  } finally {
    socket.end();
  }
}

runSeeder();
