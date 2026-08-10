#!/usr/bin/env node
/**
 * seed-k8s.js
 * Seeds all questions (Round 1, Round 2, Round 3/Polls) directly into Kubernetes Redis
 * Run: node backend/scripts/seed-k8s.js
 * Requires: kubectl configured and pointing to the right cluster
 */

const { execSync } = require('child_process');

const NAMESPACE = 'turing-test';
const REDIS_POD = 'redis-0';
const REDIS_PASSWORD = 'production-redis-password';

function redisCmd(cmd) {
  try {
    const result = execSync(
      `kubectl exec -n ${NAMESPACE} ${REDIS_POD} -- redis-cli -a ${REDIS_PASSWORD} --no-auth-warning ${cmd}`,
      { timeout: 10000 }
    ).toString().trim();
    return result;
  } catch (e) {
    console.error(`Redis error for: ${cmd}`, e.stderr?.toString() || e.message);
    return null;
  }
}

function hmset(key, obj) {
  const args = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `"${k}" "${String(v).replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`)
    .join(' ');
  return redisCmd(`HMSET "${key}" ${args}`);
}

const round1Questions = [
  {
    id: 'r1-q1', order: 1, text: 'What\'s your take on vibe coding, just letting AI write most of your code?',
    type: 'guess-author', timeLimit: 300,
    options: JSON.stringify([
      { id: 'A', text: 'It\'s useful for prototyping and boilerplate, but relying on it fully without understanding the logic underneath tends to bite you during debugging or in interviews. Best used as an accelerator, not a replacement for fundamentals.', author: 'Human' },
      { id: 'B', text: 'Honestly I do it way more than I should. Copy paste, run, if it breaks I panic and start googling instead of actually reading the error.', author: 'Gemini' }
    ])
  },
  {
    id: 'r1-q2', order: 2, text: 'How much do you trust AI chatbots to give you correct information?',
    type: 'guess-author', timeLimit: 300,
    options: JSON.stringify([
      { id: 'A', text: 'Depends what for. If it\'s something like a recipe or general knowledge I trust it, but the moment it\'s something specific to me, like my college syllabus, it just makes stuff up confidently.', author: 'Human' },
      { id: 'B', text: 'It\'s generally reliable for broad, well established information, but accuracy can drop for niche, recent, or highly specific topics, so it\'s good practice to verify anything important.', author: 'Gemini' }
    ])
  },
  {
    id: 'r1-q3', order: 3, text: 'Do you think phones have made us less social?',
    type: 'guess-author', timeLimit: 300,
    options: JSON.stringify([
      { id: 'A', text: 'In some ways yes, since face-to-face interaction time has decreased, but phones also enable new forms of connection like group chats and video calls that weren\'t possible before. It\'s more of a shift than a pure decline.', author: 'Human' },
      { id: 'B', text: 'Kind of, but honestly I blame myself more than the phone. I could put it away and I just don\'t.', author: 'Gemini' }
    ])
  },
  {
    id: 'r1-q4', order: 4, text: 'What app do you think you spend way too much time on?',
    type: 'guess-author', timeLimit: 300,
    options: JSON.stringify([
      { id: 'A', text: 'Instagram reels, no competition. I tell myself five minutes and then it\'s an hour and I don\'t even remember what I watched.', author: 'Human' },
      { id: 'B', text: 'Short-form video apps in general tend to be the biggest time sinks due to their endless scroll design, which is built to maximize engagement rather than user benefit.', author: 'Gemini' }
    ])
  },
  {
    id: 'r1-q5', order: 5, text: 'Would you rather lose your phone for a week or your laptop for a week?',
    type: 'guess-author', timeLimit: 300,
    options: JSON.stringify([
      { id: 'A', text: 'Losing the laptop would likely be more manageable short term, since most daily communication and quick tasks can be handled on a phone, whereas a laptop is harder to replace for focused work.', author: 'Human' },
      { id: 'B', text: 'Laptop honestly, I\'d survive. Losing my phone for a week sounds like actual torture, all my passwords and OTPs are on it.', author: 'Gemini' }
    ])
  },
  {
    id: 'r1-q6', order: 6, text: 'Do you think social media does more harm than good?',
    type: 'guess-author', timeLimit: 300,
    options: JSON.stringify([
      { id: 'A', text: 'More harm probably, but I say that while still using it every day, so take that with a grain of salt.', author: 'Human' },
      { id: 'B', text: 'It\'s mixed. Social media has clear benefits like connectivity and access to information, but also documented downsides related to mental health and misinformation, so the impact really depends on usage patterns.', author: 'Gemini' }
    ])
  }
];

const round2Questions = [
  {
    id: 'r2-q1', order: 1, text: 'Round 2 - Server Room: Which image is AI-generated?',
    type: 'image-choice', timeLimit: 300,
    images: JSON.stringify([{ src: '/reference/r2/image1.webp', label: 'Image 1' }, { src: '/reference/r2/image2.webp', label: 'Image 2' }]),
    options: JSON.stringify([{ key: 'A', label: 'Image 1' }, { key: 'B', label: 'Image 2' }])
  },
  {
    id: 'r2-q2', order: 2, text: 'Round 2 - Wildlife Photography: Which part of the image was AI-edited?',
    type: 'image-choice', timeLimit: 300,
    image: '/reference/r2/image3.webp',
    options: JSON.stringify([
      { key: 'A', label: 'The head / face' },
      { key: 'B', label: 'The stripes on the abdomen' },
      { key: 'C', label: 'The legs' },
      { key: 'D', label: 'The background' }
    ])
  },
  {
    id: 'r2-q3', order: 3, text: 'Round 2 - Street Photography: Write a prompt that recreates this image as closely as possible.',
    type: 'text', timeLimit: 300,
    image: '/reference/r2/image4.webp',
    placeholder: 'Describe the scene, lighting, camera style, subjects, atmosphere...',
    options: JSON.stringify([])
  },
  {
    id: 'r2-q4', order: 4, text: 'Round 2 - Bird Photography: Is this image real or AI-generated?',
    type: 'image-choice', timeLimit: 300,
    image: '/reference/r2/image5.webp',
    options: JSON.stringify([{ key: 'A', label: 'Real' }, { key: 'B', label: 'AI-generated' }])
  }
];

const round3Questions = [
  {
    id: 'r3-q1', order: 1, text: 'Poll 1 - Daily Life',
    type: 'poll', timeLimit: 300,
    options: JSON.stringify([
      { key: 'A', question: 'What does a perfect Sunday look like for you?', answer: 'A slow morning, a good lunch, maybe getting a few things done, and a quiet evening. I\'ve started appreciating days where absolutely nothing interesting happens.' },
      { key: 'B', question: 'What\'s something your friends often tease you about?', answer: 'Probably how quickly I start thinking about going home during gatherings. Staying out past midnight somehow stopped feeling worth it a while ago.' },
      { key: 'C', question: 'What\'s one thing you almost never leave home without?', answer: 'My wallet. I use my phone for payments quite often now, but leaving without a wallet still makes me feel like I\'ve forgotten something important.' }
    ])
  },
  {
    id: 'r3-q2', order: 2, text: 'Poll 2 - Memories & Experiences',
    type: 'poll', timeLimit: 300,
    options: JSON.stringify([
      { key: 'A', question: 'What\'s something younger people do that you find interesting?', answer: 'How naturally they document ordinary things. A meal arrives, someone notices something funny, or a song starts playing and a phone immediately comes out. I rarely think of doing that first.' },
      { key: 'B', question: 'What\'s a change in everyday life that still amazes you?', answer: 'Probably how many separate things have quietly disappeared into one device. I used to think of maps, music, photographs and payments as completely unrelated things.' },
      { key: 'C', question: 'How did you usually discover new music growing up?', answer: 'Mostly through friends or hearing something somewhere repeatedly. Sometimes you\'d like one song enough to take a chance on everything else by the same artist.' }
    ])
  },
  {
    id: 'r3-q3', order: 3, text: 'Poll 3 - Work & Thinking',
    type: 'poll', timeLimit: 300,
    options: JSON.stringify([
      { key: 'A', question: 'What\'s the most tiring part of your work?', answer: 'Probably revisiting the same information repeatedly. Sometimes one detail that seemed insignificant at first changes how everything else fits together.' },
      { key: 'B', question: 'What skill do you think you\'re unusually good at?', answer: 'Remembering small differences in how people explain things. I tend to notice when a detail changes slightly the second time something is discussed.' },
      { key: 'C', question: 'What\'s something you do before an important meeting?', answer: 'I usually go through everything beforehand and make a rough mental list of what might come up. I prefer having more information than I need rather than missing something important.' }
    ])
  },
  {
    id: 'r3-q4', order: 4, text: 'Poll 4 - Behaviour & Perspective',
    type: 'poll', timeLimit: 300,
    options: JSON.stringify([
      { key: 'A', question: 'What\'s something you find interesting about conversations?', answer: 'How differently two people can remember the same situation. Neither person necessarily thinks they\'re wrong, but the details can still be surprisingly different.' },
      { key: 'B', question: 'What\'s something you\'ve become less impressed by over time?', answer: 'Confidence. Someone sounding completely certain doesn\'t really tell me whether they\'re right anymore. I tend to pay more attention to the details.' },
      { key: 'C', question: 'What do your friends sometimes find annoying about you?', answer: 'I ask too many follow-up questions. Sometimes they just want a quick opinion, and I somehow turn it into a much longer conversation before answering.' }
    ])
  },
  {
    id: 'r3-q5', order: 5, text: 'Poll 5 - Personal Interests',
    type: 'poll', timeLimit: 300,
    options: JSON.stringify([
      { key: 'A', question: 'What kind of moments do you remember most clearly?', answer: 'Usually very brief ones. A particular expression, something unusual happening behind everyone else, or a place looking completely different for a few seconds.' },
      { key: 'B', question: 'What\'s something you\'re unusually patient about?', answer: 'Waiting when I feel the timing matters. I don\'t mind staying in the same place for a while if rushing would mean missing something interesting.' },
      { key: 'C', question: 'When you visit somewhere new, what do you usually do first?', answer: 'Usually walk around without deciding too much beforehand. I tend to notice smaller details and occasionally end up spending far too long in places other people pass through quickly.' }
    ])
  }
];

async function seed() {
  console.log('🌱 Seeding questions into Kubernetes Redis...\n');

  // Clear existing question data
  console.log('Clearing old question keys...');
  redisCmd('DEL "questions:r1" "questions:r2" "questions:r3" "round:questions:r1" "round:questions:r2" "round:questions:r3"');

  // Delete old question hashes
  const existingQKeys = execSync(
    `kubectl exec -n ${NAMESPACE} ${REDIS_POD} -- redis-cli -a ${REDIS_PASSWORD} --no-auth-warning keys "question:r1:*" "question:r2:*" "question:r3:*"`,
    { timeout: 10000 }
  ).toString().trim().split('\n').filter(k => k.trim());

  for (const k of existingQKeys) {
    if (k.trim()) redisCmd(`DEL "${k.trim()}"`);
  }

  // Setup Round 1
  console.log('\n📦 Seeding Round 1 (Conversation: Human vs AI)...');
  hmset('round:r1', {
    id: 'r1',
    name: 'Round 1: The Turing Test',
    status: 'idle',
    durationSeconds: '300',
    order: '1'
  });
  // Ensure round is in the order list
  redisCmd('LREM "rounds:order" 0 "r1"');
  redisCmd('RPUSH "rounds:order" "r1"');

  for (const q of round1Questions) {
    const key = `question:r1:${q.id}`;
    hmset(key, {
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options,
      images: q.images || '',
      image: q.image || '',
      placeholder: q.placeholder || '',
      timeLimit: String(q.timeLimit),
      order: String(q.order),
      roundId: 'r1'
    });
    redisCmd(`RPUSH "questions:r1" "${q.id}"`);
    console.log(`  ✓ ${q.id}: ${q.text.substring(0, 50)}...`);
  }

  // Setup Round 2
  console.log('\n📦 Seeding Round 2 (Image Analysis)...');
  hmset('round:r2', {
    id: 'r2',
    name: 'Round 2: Spot the AI',
    status: 'idle',
    durationSeconds: '300',
    order: '2'
  });
  redisCmd('LREM "rounds:order" 0 "r2"');
  redisCmd('RPUSH "rounds:order" "r2"');

  for (const q of round2Questions) {
    const key = `question:r2:${q.id}`;
    hmset(key, {
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options,
      images: q.images || '',
      image: q.image || '',
      placeholder: q.placeholder || '',
      timeLimit: String(q.timeLimit),
      order: String(q.order),
      roundId: 'r2'
    });
    redisCmd(`RPUSH "questions:r2" "${q.id}"`);
    console.log(`  ✓ ${q.id}: ${q.text.substring(0, 50)}...`);
  }

  // Setup Round 3
  console.log('\n📦 Seeding Round 3 (Polls: Decode the Person)...');
  hmset('round:r3', {
    id: 'r3',
    name: 'Round 3: Decode the Person',
    status: 'idle',
    durationSeconds: '300',
    order: '3'
  });
  redisCmd('LREM "rounds:order" 0 "r3"');
  redisCmd('RPUSH "rounds:order" "r3"');

  for (const q of round3Questions) {
    const key = `question:r3:${q.id}`;
    hmset(key, {
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options,
      images: '',
      image: '',
      placeholder: '',
      timeLimit: String(q.timeLimit),
      order: String(q.order),
      roundId: 'r3'
    });
    redisCmd(`RPUSH "questions:r3" "${q.id}"`);
    console.log(`  ✓ ${q.id}: ${q.text.substring(0, 50)}...`);
  }

  // Verify
  const r1Count = redisCmd('LLEN "questions:r1"');
  const r2Count = redisCmd('LLEN "questions:r2"');
  const r3Count = redisCmd('LLEN "questions:r3"');
  
  console.log('\n✅ Seeding complete!');
  console.log(`   Round 1: ${r1Count} questions`);
  console.log(`   Round 2: ${r2Count} questions`);
  console.log(`   Round 3: ${r3Count} questions`);
  console.log('\nRounds order:');
  console.log(redisCmd('LRANGE "rounds:order" 0 -1'));
}

seed().catch(console.error);
